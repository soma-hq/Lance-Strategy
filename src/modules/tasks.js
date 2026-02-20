/**
 * TasksModule - Gestion des tâches avec filtres avancés
 */
const TasksModule = {
	selectedUsers: [],
	selectedProjects: [],
	selectedPriorities: [],
	currentStatusFilter: "",

	init() {
		this.render();
		this.bindEvents();
	},

	render() {
		const page = document.getElementById("tasksPage");
		if (!page) return;

		const canCreate = Auth.hasPermission("create");

		page.innerHTML = `
			<div class="section-header" style="margin-bottom: 0.75rem;">
				<div>
					<h2>
						<span class="page-title-icon">${Icons.get("checkSquare", 18)}</span>
						Tâches
					</h2>
					<p class="page-description">Gère tes tâches et suis leur avancement facilement</p>
				</div>
			</div>

			<!-- Controls Bar -->
			<div class="products-controls" style="margin-bottom: 1rem;">
				<div class="products-controls-left">
					${this.renderAdvancedFilters()}
				</div>
				${canCreate ? '<button class="btn-primary" id="addTaskBtn">Nouvelle tâche</button>' : ""}
			</div>

			<!-- Liste des tâches -->
			<div id="tasksContent">
				${this.renderTasksList()}
			</div>

			<!-- Modal -->
			<div id="taskModal" class="modal">
				<div class="modal-content">
					<div class="modal-header">
						<h2 class="modal-title">Nouvelle tâche</h2>
						<button class="btn-icon" onclick="TasksModule.closeModal()">${Icons.get("x", 18)}</button>
					</div>
					<div class="modal-body">
						<form id="taskForm">
							<input type="hidden" id="taskId">
							<div class="form-group">
								<label for="taskTitle">Titre</label>
								<input type="text" id="taskTitle" required>
							</div>
							<div class="form-group">
								<label for="taskDescription">Description</label>
								<textarea id="taskDescription" rows="3"></textarea>
							</div>
							<div class="form-row">
								<div class="form-group">
									<label for="taskDueDate">Date d'échéance</label>
									<input type="date" id="taskDueDate" required>
								</div>
								<div class="form-group">
									<label for="taskPriority">Priorité</label>
									<select id="taskPriority">
										<option value="low">Basse</option>
										<option value="medium" selected>Moyenne</option>
										<option value="high">Haute</option>
									</select>
								</div>
							</div>
							<div class="form-row">
								<div class="form-group">
									<label for="taskAssignee">Assigné à</label>
									<select id="taskAssignee" required>
										${DataManager.get("users")
											.filter((u) => u.active)
											.map(
												(u) => `
											<option value="${u.id}">${u.name}</option>
										`,
											)
											.join("")}
									</select>
								</div>
								<div class="form-group">
									<label for="taskProject">Projet (optionnel)</label>
									<select id="taskProject">
										<option value="">Aucun projet</option>
										${DataManager.get("projects")
											.map(
												(p) => `
											<option value="${p.id}">${p.name}</option>
										`,
											)
											.join("")}
									</select>
								</div>
							</div>
						</form>
					</div>
					<div class="modal-footer">
						<button class="btn-secondary" onclick="TasksModule.closeModal()">Annuler</button>
						<button class="btn-success" onclick="TasksModule.saveTask()">Enregistrer</button>
					</div>
				</div>
			</div>
		`;

		// Build and inject task detail modal separately
		const detailModalEl = document.getElementById("taskDetailModal");
		if (!detailModalEl) {
			const dm = document.createElement("div");
			dm.id = "taskDetailModal";
			dm.className = "modal-overlay";
			dm.style.display = "none";
			dm.innerHTML = `
				<div class="modal-content" style="max-width:860px;width:92vw;">
					<div class="modal-header">
						<h2 class="modal-title" id="taskDetailTitle">T\u00e2che</h2>
						<div style="display:flex;gap:0.5rem;align-items:center;">
							<span id="taskDetailStatusBadge"></span>
							<button class="btn-secondary btn-sm" id="taskDetailEditBtn" style="font-size:0.8rem;">${Icons.get("edit", 14)} Modifier</button>
							<button class="btn-icon" onclick="TasksModule.closeTaskDetail()">${Icons.get("x", 18)}</button>
						</div>
					</div>
					<div class="modal-body" id="taskDetailBody" style="padding:1.25rem 1.5rem;"></div>
				</div>
			`;
			document.body.appendChild(dm);
		}

		const addBtn = document.getElementById("addTaskBtn");
		if (addBtn) {
			addBtn.addEventListener("click", () => this.showAddModal());
		}
	},

	renderAdvancedFilters() {
		const data = DataManager.getData();
		const users = data.users || [];
		const projects = data.projects || [];

		const statusLabel = {
			"": "Actives",
			"today": "Aujourd'hui",
			"upcoming": "À venir",
			"overdue": "En retard",
			"completed": "Réalisées",
			"cancelled": "Annulées",
			}[this.currentStatusFilter] || "Actives";

		return `
			<!-- Status filter -->
			<div class="filter-dropdown" id="filterTaskStatus">
				<button class="filter-btn ${this.currentStatusFilter !== "" ? "active" : ""}" onclick="TasksModule.toggleFilterDropdown('filterTaskStatus')">
					<span class="filter-btn-label">Période:</span>
					<span class="filter-btn-value">${statusLabel}</span>
					<svg class="filter-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polyline points="6 9 12 15 18 9"/>
					</svg>
				</button>
				<div class="filter-menu">
					<div class="filter-menu-item ${this.currentStatusFilter === "" ? "selected" : ""}" onclick="TasksModule.selectStatus('')">
						<div class="filter-checkbox">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
								<polyline points="20 6 9 17 4 12"/>
							</svg>
						</div>
						<span class="filter-menu-item-label">Toutes</span>
					</div>
					<div class="filter-menu-divider"></div>
					<div class="filter-menu-item ${this.currentStatusFilter === "today" ? "selected" : ""}" onclick="TasksModule.selectStatus('today')">
						<div class="filter-checkbox">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
								<polyline points="20 6 9 17 4 12"/>
							</svg>
						</div>
						<span class="filter-menu-item-label">Aujourd'hui</span>
					</div>
					<div class="filter-menu-item ${this.currentStatusFilter === "upcoming" ? "selected" : ""}" onclick="TasksModule.selectStatus('upcoming')">
						<div class="filter-checkbox">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
								<polyline points="20 6 9 17 4 12"/>
							</svg>
						</div>
						<span class="filter-menu-item-label">À venir</span>
					</div>
					<div class="filter-menu-item ${this.currentStatusFilter === "overdue" ? "selected" : ""}" onclick="TasksModule.selectStatus('overdue')">
						<div class="filter-checkbox">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
								<polyline points="20 6 9 17 4 12"/>
							</svg>
						</div>
						<span class="filter-menu-item-label">En retard</span>
					</div>
					<div class="filter-menu-item ${this.currentStatusFilter === "completed" ? "selected" : ""}" onclick="TasksModule.selectStatus('completed')">
						<div class="filter-checkbox">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
								<polyline points="20 6 9 17 4 12"/>
							</svg>
						</div>
						<span class="filter-menu-item-label">Réalisées</span>
					</div>
					<div class="filter-menu-item ${this.currentStatusFilter === "cancelled" ? "selected" : ""}" onclick="TasksModule.selectStatus('cancelled')">
						<div class="filter-checkbox">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
								<polyline points="20 6 9 17 4 12"/>
							</svg>
						</div>
						<span class="filter-menu-item-label">Annulées</span>
					</div>
				</div>
			</div>
			<div class="filter-dropdown" id="filterTaskUsers">
					<button class="filter-btn ${this.selectedUsers.length > 0 ? "active" : ""}" onclick="TasksModule.toggleFilterDropdown('filterTaskUsers')">
						<span class="filter-btn-label">Personnes:</span>
						<span class="filter-btn-value">${this.getFilterLabel("users")}</span>
						<svg class="filter-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<polyline points="6 9 12 15 18 9"/>
						</svg>
					</button>
					<div class="filter-menu">
						<div class="filter-menu-item ${this.selectedUsers.length === 0 ? "selected" : ""}" onclick="TasksModule.selectUser('all')">
							<div class="filter-checkbox">
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
									<polyline points="20 6 9 17 4 12"/>
								</svg>
							</div>
							<span class="filter-menu-item-label">TOUS</span>
						</div>
						<div class="filter-menu-divider"></div>
						${users
							.filter((u) => u.active)
							.map(
								(user) => `
							<div class="filter-menu-item ${this.selectedUsers.includes(user.id) ? "selected" : ""}" onclick="TasksModule.selectUser(${user.id})">
								<div class="filter-checkbox">
									<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
										<polyline points="20 6 9 17 4 12"/>
									</svg>
								</div>
								<div class="filter-user-avatar">${user.avatar}</div>
								<span class="filter-menu-item-label">${user.name}</span>
							</div>
						`,
							)
							.join("")}
					</div>
				</div>

				<!-- Filtre Projets -->
				<div class="filter-dropdown" id="filterTaskProjects">
					<button class="filter-btn ${this.selectedProjects.length > 0 ? "active" : ""}" onclick="TasksModule.toggleFilterDropdown('filterTaskProjects')">
						<span class="filter-btn-label">Projets:</span>
						<span class="filter-btn-value">${this.getFilterLabel("projects")}</span>
						<svg class="filter-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<polyline points="6 9 12 15 18 9"/>
						</svg>
					</button>
					<div class="filter-menu">
						<div class="filter-menu-item ${this.selectedProjects.length === 0 ? "selected" : ""}" onclick="TasksModule.selectProject('all')">
							<div class="filter-checkbox">
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
									<polyline points="20 6 9 17 4 12"/>
								</svg>
							</div>
							<span class="filter-menu-item-label">TOUS</span>
						</div>
						<div class="filter-menu-divider"></div>
						${projects
							.map(
								(project) => `
							<div class="filter-menu-item ${this.selectedProjects.includes(project.id) ? "selected" : ""}" onclick="TasksModule.selectProject(${project.id})">
								<div class="filter-checkbox">
									<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
										<polyline points="20 6 9 17 4 12"/>
									</svg>
								</div>
								<span class="project-emoji">${project.emoji || "📁"}</span>
								<span class="filter-menu-item-label">${project.name}</span>
							</div>
						`,
							)
							.join("")}
					</div>
				</div>

				<!-- Filtre Priorité -->
				<div class="filter-dropdown" id="filterTaskPriorities">
					<button class="filter-btn ${this.selectedPriorities.length > 0 ? "active" : ""}" onclick="TasksModule.toggleFilterDropdown('filterTaskPriorities')">
						<span class="filter-btn-label">Priorités:</span>
						<span class="filter-btn-value">${this.getFilterLabel("priorities")}</span>
						<svg class="filter-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<polyline points="6 9 12 15 18 9"/>
						</svg>
					</button>
					<div class="filter-menu">
						<div class="filter-menu-item ${this.selectedPriorities.includes("high") ? "selected" : ""}" onclick="TasksModule.selectPriority('high')">
							<div class="filter-checkbox">
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
									<polyline points="20 6 9 17 4 12"/>
								</svg>
							</div>
							<div class="filter-priority-dot high"></div>
							<span class="filter-menu-item-label">Haute</span>
						</div>
						<div class="filter-menu-item ${this.selectedPriorities.includes("medium") ? "selected" : ""}" onclick="TasksModule.selectPriority('medium')">
							<div class="filter-checkbox">
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
									<polyline points="20 6 9 17 4 12"/>
								</svg>
							</div>
							<div class="filter-priority-dot medium"></div>
							<span class="filter-menu-item-label">Moyenne</span>
						</div>
						<div class="filter-menu-item ${this.selectedPriorities.includes("low") ? "selected" : ""}" onclick="TasksModule.selectPriority('low')">
							<div class="filter-checkbox">
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
									<polyline points="20 6 9 17 4 12"/>
								</svg>
							</div>
							<div class="filter-priority-dot low"></div>
							<span class="filter-menu-item-label">Basse</span>
						</div>
					</div>
				</div>
		`;
	},

	renderTasksList() {
		const tasks = DataManager.get("tasks") || [];
		const canEdit = Auth.hasPermission("edit");

		// Apply filters
		let filteredTasks = tasks.slice();

		// By default, hide completed and cancelled tasks
		if (!this.currentStatusFilter) {
			filteredTasks = filteredTasks.filter((t) => !t.completed && !t.cancelled);
		}

		// Status filter (from tabs)
		if (this.currentStatusFilter) {
			const today = new Date();
			today.setHours(0, 0, 0, 0);

			if (this.currentStatusFilter === "today") {
				filteredTasks = filteredTasks.filter((t) => {
					const taskDate = new Date(t.dueDate);
					taskDate.setHours(0, 0, 0, 0);
					return (
						taskDate.getTime() === today.getTime() && !t.completed
					);
				});
			} else if (this.currentStatusFilter === "upcoming") {
				filteredTasks = filteredTasks.filter((t) => {
					const taskDate = new Date(t.dueDate);
					taskDate.setHours(0, 0, 0, 0);
					return taskDate > today && !t.completed;
				});
			} else if (this.currentStatusFilter === "overdue") {
				filteredTasks = filteredTasks.filter((t) => {
					const taskDate = new Date(t.dueDate);
					taskDate.setHours(0, 0, 0, 0);
					return taskDate < today && !t.completed;
				});
			} else if (this.currentStatusFilter === "completed") {
				filteredTasks = filteredTasks.filter((t) => t.completed);
			}
		}

		// User filter
		if (this.selectedUsers.length > 0) {
			filteredTasks = filteredTasks.filter((t) =>
				this.selectedUsers.includes(t.assigneeId),
			);
		}

		// Project filter
		if (this.selectedProjects.length > 0) {
			filteredTasks = filteredTasks.filter(
				(t) =>
					t.projectId &&
					this.selectedProjects.includes(parseInt(t.projectId)),
			);
		}

		// Priority filter
		if (this.selectedPriorities.length > 0) {
			filteredTasks = filteredTasks.filter((t) =>
				this.selectedPriorities.includes(t.priority),
			);
		}

		if (filteredTasks.length === 0) {
			const canCreate = Auth.hasPermission("create");
			return `
				<div class="empty-state-dashed">
					<div style="color: var(--text-muted); margin-bottom: 0.75rem;">
						<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="2">
							<polyline points="9 16.17 4.83 12 3 13.83 9 20 21 8"/>
						</svg>
					</div>
					<h4>Aucune tâche actuelle</h4>
					<p>Essaie de modifier les filtres ou crée une nouvelle tâche</p>
					${
						canCreate
							? `<button class="btn-primary btn-sm" style="margin-top: 0.75rem;" onclick="TasksModule.showAddModal()">
							Nouvelle tâche
						</button>`
							: ""
					}
				</div>
			`;
		}

		return `
			<div class="tasks-list">
				${filteredTasks.map((task) => this.renderTaskCard(task, canEdit)).join("")}
			</div>
		`;
	},

	renderTaskCard(task, canEdit) {
		const assignee = DataManager.findById("users", task.assigneeId);
		const project = task.projectId
			? DataManager.findById("projects", parseInt(task.projectId))
			: null;
		const dueDate = new Date(task.dueDate);
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const taskDate = new Date(dueDate);
		taskDate.setHours(0, 0, 0, 0);
		const isOverdue = !task.completed && taskDate < today;

		const priorityColors = {
			low: "#6c757d",
			medium: "#ffa726",
			high: "#e87c7c",
		};

		const priorityLabels = {
			low: "Basse",
			medium: "Moyenne",
			high: "Haute",
		};

		return `
			<div class="task-card ${task.completed ? "completed" : task.cancelled ? "cancelled" : ""}" data-task-id="${task.id}" oncontextmenu="event.preventDefault();TasksModule.showContextMenu(event,${task.id})">
				<div class="task-card-main" onclick="TasksModule.openTaskDetail(${task.id})">
					${
						canEdit
							? `
						<input type="checkbox" class="task-checkbox"
							${task.completed ? "checked" : ""}
							onclick="event.stopPropagation(); TasksModule.toggleTask(${task.id})"
							style="accent-color: var(--primary, #4a90e2);">
					`
							: ""
					}
					<div class="task-card-content">
						<div class="task-card-header">
							<h4 class="task-title">${task.title}</h4>
							<span class="task-priority-dot" style="background:${priorityColors[task.priority]}" title="${priorityLabels[task.priority]}"></span>
						</div>
						<div class="task-meta">
							<span class="task-meta-item ${isOverdue ? "overdue" : ""}">
								<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
									<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
									<line x1="16" y1="2" x2="16" y2="6"/>
									<line x1="8" y1="2" x2="8" y2="6"/>
									<line x1="3" y1="10" x2="21" y2="10"/>
								</svg>
								${task.dueDate ? dueDate.toLocaleDateString("fr-FR") : "Sans date"}
							</span>
							<span class="task-meta-item">
								<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
									<circle cx="12" cy="7" r="4"/>
								</svg>
								${assignee?.name || "—"}
							</span>
							${project ? `<span class="task-project-badge">${Icons.get("folder", 12)} ${project.name}</span>` : ""}
						</div>
					</div>
				</div>
			</div>
		`;
	},

	getFilterLabel(type) {
		if (type === "users") {
			if (this.selectedUsers.length === 0) return "Tous";
			if (this.selectedUsers.length === 1) {
				const user = DataManager.getData().users.find(
					(u) => u.id === this.selectedUsers[0],
				);
				return user ? user.name : "Sélectionnés";
			}
			return `${this.selectedUsers.length} sélectionnés`;
		}

		if (type === "projects") {
			if (this.selectedProjects.length === 0) return "Tous";
			if (this.selectedProjects.length === 1) {
				const project = DataManager.getData().projects.find(
					(p) => p.id === this.selectedProjects[0],
				);
				return project ? project.name : "Sélectionnés";
			}
			return `${this.selectedProjects.length} sélectionnés`;
		}

		if (type === "priorities") {
			if (this.selectedPriorities.length === 0) return "Toutes";
			const labels = { high: "Haute", medium: "Moyenne", low: "Basse" };
			if (this.selectedPriorities.length === 1) {
				return labels[this.selectedPriorities[0]] || "Sélectionnées";
			}
			return `${this.selectedPriorities.length} sélectionnées`;
		}

		return "Tous";
	},

	toggleFilterDropdown(id) {
		const dropdown = document.getElementById(id);
		const isOpen = dropdown.classList.contains("open");
		document
			.querySelectorAll(".filter-dropdown")
			.forEach((d) => d.classList.remove("open"));
		if (!isOpen) dropdown.classList.add("open");
	},

	selectUser(userId) {
		if (userId === "all") {
			this.selectedUsers = [];
		} else {
			const index = this.selectedUsers.indexOf(userId);
			if (index > -1) {
				this.selectedUsers.splice(index, 1);
			} else {
				this.selectedUsers.push(userId);
			}
		}
		document.getElementById("tasksContent").innerHTML =
			this.renderTasksList();
		document
			.getElementById("filterTaskUsers")
			.querySelector(".filter-btn").innerHTML = `
			<span class="filter-btn-label">Personnes:</span>
			<span class="filter-btn-value">${this.getFilterLabel("users")}</span>
			<svg class="filter-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<polyline points="6 9 12 15 18 9"/>
			</svg>
		`;
		document
			.getElementById("filterTaskUsers")
			.querySelector(".filter-btn")
			.classList.toggle("active", this.selectedUsers.length > 0);
		this.render();
	},

	selectProject(projectId) {
		if (projectId === "all") {
			this.selectedProjects = [];
		} else {
			const index = this.selectedProjects.indexOf(projectId);
			if (index > -1) {
				this.selectedProjects.splice(index, 1);
			} else {
				this.selectedProjects.push(projectId);
			}
		}
		this.render();
	},

	selectPriority(priority) {
		const index = this.selectedPriorities.indexOf(priority);
		if (index > -1) {
			this.selectedPriorities.splice(index, 1);
		} else {
			this.selectedPriorities.push(priority);
		}
		this.render();
	},

	setStatusFilter(event, status) {
		event.preventDefault();
		this.currentStatusFilter = status;
		document.getElementById("tasksContent").innerHTML = this.renderTasksList();
	},

	selectStatus(status) {
		this.currentStatusFilter = status;
		// Close all open dropdowns
		document.querySelectorAll(".filter-dropdown.open").forEach(d => d.classList.remove("open"));
		// Re-render controls to update the filter label
		this.render();
	},

	initFilterIndicator() {
		const activeTab = document.querySelector(".filter-tab.active");
		const indicator = document.querySelector(".filter-indicator");

		if (activeTab && indicator) {
			const offset = activeTab.offsetLeft;
			const width = activeTab.offsetWidth;
			indicator.style.left = `${offset}px`;
			indicator.style.width = `${width}px`;
		}
	},

	showAddModal() {
		document.getElementById("taskId").value = "";
		document.getElementById("taskForm").reset();
		document.getElementById("taskModal").classList.add("active");
	},

	editTask(id) {
		const task = DataManager.findById("tasks", id);
		if (!task) return;

		document.getElementById("taskId").value = task.id;
		document.getElementById("taskTitle").value = task.title;
		document.getElementById("taskDescription").value =
			task.description || "";
		document.getElementById("taskDueDate").value =
			task.dueDate.split("T")[0];
		document.getElementById("taskPriority").value = task.priority;
		document.getElementById("taskAssignee").value = task.assigneeId;
		document.getElementById("taskProject").value = task.projectId || "";
		document.getElementById("taskModal").classList.add("active");
	},

	saveTask() {
		const id = document.getElementById("taskId").value;
		const taskData = {
			title: document.getElementById("taskTitle").value,
			description: document.getElementById("taskDescription").value,
			dueDate: document.getElementById("taskDueDate").value,
			priority: document.getElementById("taskPriority").value,
			assigneeId: parseInt(document.getElementById("taskAssignee").value),
			projectId: document.getElementById("taskProject").value
				? parseInt(document.getElementById("taskProject").value)
				: null,
			completed: false,
		};

		if (id) {
			const existingTask = DataManager.findById("tasks", parseInt(id));
			taskData.completed = existingTask.completed;
			DataManager.update("tasks", parseInt(id), taskData);
			showToast("Tâche modifiée", "success");
		} else {
			DataManager.add("tasks", taskData);
			showToast("Tâche créée", "success");
		}

		this.closeModal();
		this.render();
		Navigation.updateDashboardStats();
	},

	toggleTask(id) {
		const task = DataManager.findById("tasks", id);
		if (!task) return;

		task.completed = !task.completed;
		DataManager.update("tasks", id, task);
		showToast(
			task.completed ? "Tâche réalisée" : "Tâche réactivée",
			"success",
		);
		this.render();
		Navigation.updateDashboardStats();
	},

	cancelTask(id) {
		const task = DataManager.findById("tasks", id);
		if (!task) return;
		task.cancelled = true;
		task.completed = false;
		DataManager.update("tasks", id, task);
		showToast("Tâche annulée", "info");
		this.render();
		Navigation.updateDashboardStats();
	},

	closeModal() {
		document.getElementById("taskModal").classList.remove("active");
	},

	showContextMenu(e, id) {
		const task = DataManager.findById("tasks", id);
		if (!task) return;
		const canEdit = Auth.hasPermission("edit");
		const canDelete = Auth.hasPermission("delete");
		const items = [
			{ label: "Voir le détail", icon: Icons.get("eye", 14), action: () => this.openTaskDetail(id) },
			...(canEdit ? [{ label: "Modifier", icon: Icons.get("edit", 14), action: () => this.editTask(id) }] : []),
			...(canEdit && !task.completed ? [{ label: "Marquer réalisée", icon: Icons.get("check", 14), action: () => this.toggleTask(id) }] : []),
			...(canEdit && !task.cancelled ? [{ label: "Annuler la tâche", icon: Icons.get("x", 14), action: () => this.cancelTask(id) }] : []),
			...(canEdit && (task.completed || task.cancelled) ? [{ label: "Réactiver", icon: Icons.get("rotateLeft", 14), action: () => { task.completed = false; task.cancelled = false; DataManager.update("tasks", id, task); this.render(); } }] : []),
			...(canDelete ? [{ divider: true }, { label: "Supprimer", icon: Icons.get("trash", 14), danger: true, action: async () => { if (await showConfirm("Supprimer la tâche", `Supprimer "${task.title}" ? Cette action est irréversible.`, "danger")) { DataManager.remove("tasks", id); showToast("Tâche supprimée", "success"); this.render(); Navigation.updateDashboardStats(); } } }] : [])
		];
		ContextMenu.show(e, items);
	},

	bindEvents() {
		document.addEventListener("click", (e) => {
			if (!e.target.closest(".filter-dropdown")) {
				document
					.querySelectorAll(".filter-dropdown")
					.forEach((d) => d.classList.remove("open"));
			}
		});
	},

	// ── Task detail modal ─────────────────────────────────────────────────

	openTaskDetail(id) {
		const task = DataManager.findById("tasks", id);
		if (!task) return;

		const users = DataManager.get("users") || [];
		const projects = DataManager.get("projects") || [];
		const assignee = task.assigneeId ? users.find(u => u.id === task.assigneeId) : null;
		const project = task.projectId ? projects.find(p => p.id === task.projectId) : null;

		const priorityLabel  = { high: "Haute", medium: "Moyenne", low: "Basse" };
		const priorityBadge  = { high: "badge-danger", medium: "badge-warning", low: "badge-info" };
		const priorityColors = { high: "#dc2626", medium: "#d97706", low: "#888880" };
		const isDone = task.completed || task.status === "done";

		// Title + status badge in header
		const titleEl = document.getElementById("taskDetailTitle");
		if (titleEl) titleEl.textContent = task.title || "Sans titre";

		const statusEl = document.getElementById("taskDetailStatusBadge");
		if (statusEl) statusEl.innerHTML = isDone
			? `<span class="badge badge-success">Terminée</span>`
			: `<span class="badge badge-warning">En cours</span>`;

		const editBtn = document.getElementById("taskDetailEditBtn");
		if (editBtn) editBtn.onclick = () => { this.closeTaskDetail(); this.editTask(id); };

		// Dates
		const dueDateDisplay = task.dueDate
			? new Date(task.dueDate).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
			: "Non définie";
		const isOverdue = !isDone && task.dueDate && new Date(task.dueDate) < new Date();

		// Created date
		const createdDisplay = task.createdAt
			? new Date(task.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
			: "";

		// Logs
		const allLogs = DataManager.get("logs") || [];
		const taskLogs = allLogs
			.filter(l => l.entityId === id || l.entityId === String(id)
				|| (l.detail || l.description || "").toLowerCase().includes((task.title || "").toLowerCase()))
			.slice(-20)
			.reverse();

		const logsHtml = taskLogs.length > 0
			? `<div class="pj-timeline">${taskLogs.map((log, i) => {
				const logDate = log.date || log.timestamp || log.createdAt || "";
				const displayDate = logDate
					? new Date(logDate).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
					: "";
				const logUser = log.userId ? users.find(u => u.id === log.userId) : null;
				return `<div class="pj-timeline-item${i === taskLogs.length - 1 ? " last" : ""}">
					<div class="pj-timeline-dot"></div>
					<div class="pj-timeline-content">
						<div class="pj-timeline-header">
							<span class="pj-timeline-action">${log.action || log.type || "Action"}</span>
							${logUser ? `<span class="pj-timeline-user">${logUser.avatar || "👤"} <span>${logUser.name}</span></span>` : ""}
						</div>
						${(log.detail || log.description) ? `<p class="pj-timeline-detail">${log.detail || log.description}</p>` : ""}
						<span class="pj-timeline-time">${displayDate}</span>
					</div>
				</div>`;
			}).join("")}</div>`
			: `<div style="text-align:center;padding:2rem 0;color:var(--text-muted);font-size:0.85rem;font-style:italic;">Aucun historique enregistré.</div>`;

		// Comments
		const comments = task.comments || [];
		const commentsHtml = comments.length > 0
			? comments.map((c, idx) => `
				<div class="pj-comment" data-comment-idx="${idx}">
					<div class="pj-comment-avatar">${c.userAvatar || "👤"}</div>
					<div class="pj-comment-body">
						<div class="pj-comment-meta">
							<span class="pj-comment-author">${c.userName || "Anonyme"}</span>
							<span class="pj-comment-time">${c.createdAt ? new Date(c.createdAt).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}</span>
						</div>
						<p class="pj-comment-text" id="tc-text-${idx}">${c.text}</p>
						<div class="pj-comment-actions">
							<button class="pj-comment-btn" onclick="TasksModule.editTaskComment(${id}, ${idx})">Modifier</button>
							<button class="pj-comment-btn danger" onclick="TasksModule.deleteTaskComment(${id}, ${idx})">Supprimer</button>
						</div>
					</div>
				</div>`).join("")
			: `<div style="text-align:center;padding:1.5rem 0;color:var(--text-muted);font-size:0.85rem;font-style:italic;">Aucun commentaire pour l'instant.</div>`;

		const body = document.getElementById("taskDetailBody");
		if (body) {
			body.innerHTML = `
				<div class="projects-modal-cols">

					<!-- LEFT: Propriétés -->
					<div class="projects-modal-left">

						<div class="pj-prop">
							<div class="pj-prop-label">${Icons.get("activity", 13)} Statut</div>
							<div class="pj-prop-value">
								${isDone
									? `<span class="badge badge-success">Terminée</span>`
									: isOverdue
										? `<span class="badge badge-danger">En retard</span>`
										: `<span class="badge badge-warning">En cours</span>`}
							</div>
						</div>

						<div class="pj-prop">
							<div class="pj-prop-label">${Icons.get("alertCircle", 13)} Priorité</div>
							<div class="pj-prop-value" style="display:flex;align-items:center;gap:0.5rem;">
								<span style="width:9px;height:9px;border-radius:50%;background:${priorityColors[task.priority] || "#888"};display:inline-block;flex-shrink:0;"></span>
								<span class="badge ${priorityBadge[task.priority] || "badge-info"}">${priorityLabel[task.priority] || task.priority}</span>
							</div>
						</div>

						<div class="pj-prop">
							<div class="pj-prop-label">${Icons.get("user", 13)} Assigné à</div>
							<div class="pj-prop-value">
								${assignee
									? `<span style="display:inline-flex;align-items:center;gap:0.4rem;">${assignee.avatar || "👤"} <span>${assignee.name}</span></span>`
									: `<em style="color:var(--text-muted);font-size:0.82rem;">Non assignée</em>`}
							</div>
						</div>

						<div class="pj-prop">
							<div class="pj-prop-label">${Icons.get("folder", 13)} Projet</div>
							<div class="pj-prop-value" style="font-size:0.87rem;">
								${project
									? `<span style="display:inline-flex;align-items:center;gap:0.35rem;">${Icons.get("folder", 13)} ${project.name}</span>`
									: `<em style="color:var(--text-muted);">Aucun</em>`}
							</div>
						</div>

						<div class="pj-prop">
							<div class="pj-prop-label">${Icons.get("calendar", 13)} Échéance</div>
							<div class="pj-prop-value" style="font-weight:600;font-size:0.87rem;${isOverdue ? "color:var(--danger);" : ""}">${dueDateDisplay}</div>
						</div>

						${createdDisplay ? `<div class="pj-prop">
							<div class="pj-prop-label">${Icons.get("clock", 13)} Créée le</div>
							<div class="pj-prop-value" style="font-size:0.82rem;color:var(--text-secondary);">${createdDisplay}</div>
						</div>` : ""}

						<div class="pj-prop" style="flex:1;">
							<div class="pj-prop-label">${Icons.get("alignLeft", 13)} Description</div>
							<div class="pj-prop-value" style="color:var(--text-secondary);line-height:1.65;font-size:0.87rem;white-space:pre-wrap;">
								${task.description || `<em style="color:var(--text-muted);">Aucune description.</em>`}
							</div>
						</div>

						<div class="pj-prop-actions">
							<button class="btn-primary btn-sm" onclick="TasksModule.closeTaskDetail(); TasksModule.editTask(${id});">
								${Icons.get("edit", 14)} Modifier
							</button>
							<button class="btn-secondary btn-sm" onclick="TasksModule.toggleTask(${id}); TasksModule.openTaskDetail(${id});">
								${isDone ? `${Icons.get("rotateLeft", 14)} Réactiver` : `${Icons.get("check", 14)} Marquer réalisée`}
							</button>
						</div>
					</div>

					<!-- RIGHT: Tabs -->
					<div class="projects-modal-right">
						<div class="modal-tabs">
							<button class="modal-tab active" data-tab="comments" onclick="TasksModule.switchTaskTab('comments')">Commentaires</button>
							<button class="modal-tab" data-tab="logs" onclick="TasksModule.switchTaskTab('logs')">Historique</button>
						</div>

						<!-- Comments -->
						<div class="modal-tab-panel active" data-panel="comments" style="display:flex;flex-direction:column;">
							<div class="pj-comments-wrap">
								<div class="pj-comments-list" id="tcCommentsList">
									${commentsHtml}
								</div>
								<div class="pj-comment-compose">
									<textarea id="tcCommentInput" class="pj-comment-input" rows="2" placeholder="Ajouter un commentaire..."></textarea>
									<button class="btn-primary btn-sm" onclick="TasksModule.addTaskComment(${id})">${Icons.get("send", 13)} Envoyer</button>
								</div>
							</div>
						</div>

						<!-- Logs timeline -->
						<div class="modal-tab-panel" data-panel="logs">
							${logsHtml}
						</div>
					</div>

				</div>
			`;
		}

		const modal = document.getElementById("taskDetailModal");
		if (modal) modal.style.display = "flex";
	},

	closeTaskDetail() {
		const modal = document.getElementById("taskDetailModal");
		if (modal) modal.style.display = "none";
	},

	switchTaskTab(tab) {
		document.querySelectorAll("#taskDetailModal .modal-tab").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
		document.querySelectorAll("#taskDetailModal .modal-tab-panel").forEach(p => p.classList.toggle("active", p.dataset.panel === tab));
	},

	addTaskComment(taskId) {
		const input = document.getElementById("tcCommentInput");
		if (!input) return;
		const text = input.value.trim();
		if (!text) return;
		const currentUser = typeof Auth !== "undefined" ? Auth.getCurrentUser() : null;
		const task = DataManager.findById("tasks", taskId);
		if (!task) return;
		const comments = [...(task.comments || [])];
		comments.push({
			text,
			userId: currentUser ? currentUser.id : null,
			userName: currentUser ? currentUser.name : "Anonyme",
			userAvatar: currentUser ? (currentUser.avatar || "👤") : "👤",
			createdAt: new Date().toISOString(),
		});
		DataManager.update("tasks", taskId, { comments });
		input.value = "";
		this.openTaskDetail(taskId);
	},

	deleteTaskComment(taskId, idx) {
		const task = DataManager.findById("tasks", taskId);
		if (!task) return;
		const comments = [...(task.comments || [])];
		comments.splice(idx, 1);
		DataManager.update("tasks", taskId, { comments });
		this.openTaskDetail(taskId);
	},

	editTaskComment(taskId, idx) {
		const task = DataManager.findById("tasks", taskId);
		if (!task) return;
		const comment = (task.comments || [])[idx];
		if (!comment) return;
		const textEl = document.getElementById(`tc-text-${idx}`);
		if (!textEl) return;
		textEl.outerHTML = `<textarea class="pj-comment-input" id="tc-edit-${idx}" rows="2" style="margin:0.3rem 0;">${comment.text}</textarea>
			<div style="display:flex;gap:0.5rem;margin-top:0.3rem;">
				<button class="pj-comment-btn" onclick="(function(){
					const val = document.getElementById('tc-edit-${idx}').value.trim();
					if (!val) return;
					const t = DataManager.findById('tasks', ${taskId});
					const c = [...(t.comments || [])];
					c[${idx}] = {...c[${idx}], text: val};
					DataManager.update('tasks', ${taskId}, { comments: c });
					TasksModule.openTaskDetail(${taskId});
				})()">Sauvegarder</button>
				<button class="pj-comment-btn" onclick="TasksModule.openTaskDetail(${taskId})">Annuler</button>
			</div>`;
	},
};

window.TasksModule = TasksModule;
