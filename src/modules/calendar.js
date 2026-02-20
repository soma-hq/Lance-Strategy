// Calendar module - Google Agenda style monthly grid view
const CalendarModule = {
	currentMonth: new Date(),
	events: [],
	editingEventId: null,

	// Available colors for events
	colorOptions: [
		{ name: "Bleu", value: "#4a90e2" },
		{ name: "Rouge", value: "#dc3545" },
		{ name: "Vert", value: "#28a745" },
		{ name: "Violet", value: "#6f42c1" },
		{ name: "Orange", value: "#f59e0b" },
		{ name: "Rose", value: "#e91e8a" },
		{ name: "Turquoise", value: "#17a2b8" },
		{ name: "Gris", value: "#6c757d" },
	],

	init() {
		this.loadEvents();
		this.render();
	},

	// Inline styles for the calendar
	getStyles() {
		return '';
	},

	// Main render method
	render() {
		const container = document.getElementById("calendarPage");
		if (!container) return;

		container.innerHTML = `
			<style>${this.getStyles()}</style>
			<div class="cal-page">
				${this.renderHeader()}
				${this.renderNavBar()}
				${this.renderGrid()}
				${this.renderEmptyState()}
			</div>
			${this.renderEventModal()}
			${this.renderDayModal()}
		`;
	},

	// Page header with title and add button
	renderHeader() {
		return `
			<div class="page-header-box">
				<div class="phb-left">
					<span class="phb-icon">${Icons.get("calendar", 18)}</span>
						<div class="phb-text">
							<h1>Calendrier</h1>
							<p class="page-description">Organise tes rendez-vous et évènements</p>
						</div>
				</div>
				<div class="page-header-box-actions">
					<button class="btn-primary" onclick="CalendarModule.openAddModal()">
						Nouvel évènement
					</button>
				</div>
			</div>
		`;
	},

	// Month/year navigation bar with arrows
	renderNavBar() {
		const year = this.currentMonth.getFullYear();
		const monthName = this.currentMonth.toLocaleDateString("fr-FR", { month: "long" });

		return `
			<div class="cal-nav">
				<button class="cal-nav-btn" onclick="CalendarModule.prevMonth()" title="Mois précédent">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
				</button>
				<span class="cal-nav-title">${monthName} ${year}</span>
				<button class="cal-nav-btn" onclick="CalendarModule.nextMonth()" title="Mois suivant">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
				</button>
			</div>
		`;
	},

	// Build the full monthly grid with weekday headers and day cells
	renderGrid() {
		const year = this.currentMonth.getFullYear();
		const month = this.currentMonth.getMonth();

		// First day of the month (0=Sun, 1=Mon, etc.)
		const firstDay = new Date(year, month, 1);
		const lastDay = new Date(year, month + 1, 0);
		const daysInMonth = lastDay.getDate();

		// Adjust so Monday is first column (convert Sun=0 to Mon-based: Mon=0, Tue=1, ..., Sun=6)
		let startDow = firstDay.getDay() - 1;
		if (startDow < 0) startDow = 6;

		// Previous month days to fill
		const prevMonthLastDay = new Date(year, month, 0).getDate();

		// Build array of day objects for the grid
		const cells = [];

		// Previous month trailing days
		for (let i = startDow - 1; i >= 0; i--) {
			const day = prevMonthLastDay - i;
			const date = new Date(year, month - 1, day);
			cells.push({ day, date, outside: true });
		}

		// Current month days
		for (let d = 1; d <= daysInMonth; d++) {
			const date = new Date(year, month, d);
			cells.push({ day: d, date, outside: false });
		}

		// Next month leading days to complete the last row
		const remaining = 7 - (cells.length % 7);
		if (remaining < 7) {
			for (let i = 1; i <= remaining; i++) {
				const date = new Date(year, month + 1, i);
				cells.push({ day: i, date, outside: true });
			}
		}

		const weekdays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

		return `
			<div class="cal-grid-wrapper">
				<div class="cal-weekdays">
					${weekdays.map((d) => `<div class="cal-weekday">${d}</div>`).join("")}
				</div>
				<div class="cal-days">
					${cells.map((cell) => this.renderDayCell(cell)).join("")}
				</div>
			</div>
		`;
	},

	// Render a single day cell with its events
	renderDayCell(cell) {
		const { day, date, outside } = cell;
		const today = new Date();
		const isToday =
			!outside &&
			date.getDate() === today.getDate() &&
			date.getMonth() === today.getMonth() &&
			date.getFullYear() === today.getFullYear();

		const dayEvents = this.getEventsForDate(date);
		const maxVisible = 3;
		const visibleEvents = dayEvents.slice(0, maxVisible);
		const extraCount = dayEvents.length - maxVisible;

		const dateStr = this.formatDateKey(date);

		let classes = "cal-day";
		if (outside) classes += " cal-day-outside";
		if (isToday) classes += " cal-day-today";

		return `
			<div class="${classes}" onclick="CalendarModule.onDayClick('${dateStr}')">
				<div class="cal-day-number-row">
					<div class="cal-day-number">${day}</div>
					<button class="cal-day-add-btn" onclick="event.stopPropagation(); CalendarModule.openAddModal('${dateStr}')" title="Nouvel évènement">+</button>
				</div>
				<div class="cal-events-list">
					${visibleEvents
						.map(
							(ev) => `
						<div class="cal-event-bar"
							style="background: ${ev.color || "#4a90e2"};"
							onclick="event.stopPropagation(); CalendarModule.openEditModal(${ev.id})"
							title="${this.escapeHtml(ev.title)}">
							${this.escapeHtml(ev.title)}
						</div>
					`,
						)
						.join("")}
					${
						extraCount > 0
							? `
						<div class="cal-event-more" onclick="event.stopPropagation(); CalendarModule.onDayClick('${dateStr}')">
							+${extraCount} autre${extraCount > 1 ? "s" : ""}
						</div>
					`
							: ""
					}
				</div>
			</div>
		`;
	},

	// Show empty state when there are no events at all
	renderEmptyState() {
		if (this.events.length > 0) return "";

		return `
			<div class="empty-state-dashed">
				<div style="color: var(--text-muted); margin-bottom: 0.75rem;">
					${Icons.get("calendar", 40)}
				</div>
				<h4>Aucun évènement actuel</h4>
				<p>Ton calendrier est vide. Cree ton premier evenement pour commencer.</p>
				<button class="btn-primary btn-sm" style="margin-top: 0.75rem;" onclick="CalendarModule.openAddModal()">
					Nouvel evenement
				</button>
			</div>
		`;
	},

	// Modal for creating/editing an event
	renderEventModal() {
		return `
			<div class="cal-modal-overlay" id="calEventModal">
				<div class="cal-modal" onclick="event.stopPropagation()">
					<div class="cal-modal-header">
						<h3 id="calModalTitle">
							Nouvel evenement
						</h3>
						<button class="btn-icon" onclick="CalendarModule.closeModal()">
							${Icons.get("x", 18)}
						</button>
					</div>
					<div class="cal-modal-body">
						<input type="hidden" id="calEventId" value="">

						<div class="form-group">
							<label for="calEventTitle">Titre *</label>
							<input type="text" id="calEventTitle" placeholder="Nom de l'evenement" required>
						</div>

						<div class="cal-form-row">
							<div class="form-group">
								<label for="calEventDate">Date *</label>
								<input type="date" id="calEventDate" required>
							</div>
							<div class="form-group">
								<label for="calEventTime">Heure</label>
								<input type="time" id="calEventTime" value="09:00">
							</div>
						</div>

						<div class="form-group">
							<label for="calEventDuration">Duree</label>
							<select id="calEventDuration">
								<option value="30min">30 minutes</option>
								<option value="1h" selected>1 heure</option>
								<option value="1h30">1h30</option>
								<option value="2h">2 heures</option>
								<option value="3h">3 heures</option>
								<option value="full">Toute la journee</option>
							</select>
						</div>

						<div class="form-group">
							<label for="calEventDescription">Description</label>
							<textarea id="calEventDescription" rows="3" placeholder="Details de l'evenement..."></textarea>
						</div>

						<div class="form-group">
							<label>Couleur</label>
							<div class="cal-color-options" id="calColorPicker">
								${this.colorOptions
									.map(
										(c, i) => `
									<div class="cal-color-swatch ${i === 0 ? "selected" : ""}"
										style="background: ${c.value};"
										data-color="${c.value}"
										onclick="CalendarModule.selectColor('${c.value}')"
										title="${c.name}">
										<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
									</div>
								`,
									)
									.join("")}
							</div>
						</div>
					</div>
					<div class="cal-modal-footer">
						<div>
							<button class="btn-danger btn-sm" id="calDeleteBtn" style="display: none;" onclick="CalendarModule.deleteEvent()">
								Supprimer
							</button>
						</div>
						<div class="cal-modal-footer-right">
							<button class="btn-secondary" onclick="CalendarModule.closeModal()">Annuler</button>
							<button class="btn-primary" onclick="CalendarModule.saveEvent()">
								${Icons.get("check", 16)}
								Enregistrer
							</button>
						</div>
					</div>
				</div>
			</div>
		`;
	},

	// Modal for viewing all events on a specific day
	renderDayModal() {
		return `
			<div class="cal-modal-overlay" id="calDayModal" onclick="CalendarModule.closeDayModal()">
				<div class="cal-modal" style="max-width: 420px;" onclick="event.stopPropagation()">
					<div class="cal-modal-header">
						<h3 id="calDayModalTitle">Evenements</h3>
						<button class="btn-icon" onclick="CalendarModule.closeDayModal()">
							${Icons.get("x", 18)}
						</button>
					</div>
					<div class="cal-modal-body" id="calDayModalBody">
					</div>
					<div class="cal-modal-footer">
						<div></div>
						<button class="btn-primary" id="calDayAddBtn" onclick="CalendarModule.closeDayModal()">
							Nouvel evenement
						</button>
					</div>
				</div>
			</div>
		`;
	},

	// Navigate to previous month
	prevMonth() {
		this.currentMonth = new Date(
			this.currentMonth.getFullYear(),
			this.currentMonth.getMonth() - 1,
			1,
		);
		this.render();
	},

	// Navigate to next month
	nextMonth() {
		this.currentMonth = new Date(
			this.currentMonth.getFullYear(),
			this.currentMonth.getMonth() + 1,
			1,
		);
		this.render();
	},

	// Jump back to today's month
	goToToday() {
		this.currentMonth = new Date();
		this.render();
	},

	// Handle click on a day cell
	onDayClick(dateStr) {
		const dayEvents = this.getEventsForDateStr(dateStr);

		if (dayEvents.length === 0) {
			// No events, open add modal pre-filled with this date
			this.openAddModal(dateStr);
			return;
		}

		// Show day detail modal
		const date = new Date(dateStr + "T00:00:00");
		const formatted = date.toLocaleDateString("fr-FR", {
			weekday: "long",
			day: "numeric",
			month: "long",
			year: "numeric",
		});

		const titleEl = document.getElementById("calDayModalTitle");
		if (titleEl)
			titleEl.textContent =
				formatted.charAt(0).toUpperCase() + formatted.slice(1);

		const bodyEl = document.getElementById("calDayModalBody");
		if (bodyEl) {
			if (dayEvents.length === 0) {
				bodyEl.innerHTML = `<div class="cal-day-no-events">Aucun evenement ce jour</div>`;
			} else {
				bodyEl.innerHTML = dayEvents
					.map(
						(ev) => `
					<div class="cal-day-event-item" onclick="CalendarModule.closeDayModal(); CalendarModule.openEditModal(${ev.id})">
						<div class="cal-day-event-dot" style="background: ${ev.color || "#4a90e2"};"></div>
						<div class="cal-day-event-info">
							<div class="cal-day-event-title">${this.escapeHtml(ev.title)}</div>
							<div class="cal-day-event-time">
								${Icons.get("clock", 12)}
								${ev.time || "Toute la journee"} ${ev.duration && ev.duration !== "full" ? "- " + ev.duration : ""}
							</div>
						</div>
					</div>
				`,
					)
					.join("");
			}
		}

		// Set the add button to create event on that date
		const addBtn = document.getElementById("calDayAddBtn");
		if (addBtn) {
			addBtn.onclick = () => {
				this.closeDayModal();
				this.openAddModal(dateStr);
			};
		}

		const modal = document.getElementById("calDayModal");
		if (modal) modal.classList.add("active");
	},

	// Open modal in create mode, optionally pre-fill a date
	openAddModal(dateStr) {
		this.editingEventId = null;

		const titleEl = document.getElementById("calModalTitle");
		if (titleEl) titleEl.textContent = "Nouvel evenement";

		document.getElementById("calEventId").value = "";
		document.getElementById("calEventTitle").value = "";
		document.getElementById("calEventDate").value =
			dateStr || this.formatDateKey(new Date());
		document.getElementById("calEventTime").value = "09:00";
		document.getElementById("calEventDuration").value = "1h";
		document.getElementById("calEventDescription").value = "";

		// Reset color picker to first color
		this.selectColor(this.colorOptions[0].value);

		// Hide delete button for new events
		const deleteBtn = document.getElementById("calDeleteBtn");
		if (deleteBtn) deleteBtn.style.display = "none";

		const modal = document.getElementById("calEventModal");
		if (modal) modal.classList.add("active");

		setTimeout(() => {
			document.getElementById("calEventTitle")?.focus();
		}, 100);
	},

	// Open modal in edit mode for an existing event
	openEditModal(eventId) {
		const ev = this.events.find((e) => e.id === eventId);
		if (!ev) return;

		this.editingEventId = eventId;

		const titleEl = document.getElementById("calModalTitle");
		if (titleEl) titleEl.textContent = "Modifier l'evenement";

		document.getElementById("calEventId").value = ev.id;
		document.getElementById("calEventTitle").value = ev.title || "";
		document.getElementById("calEventDate").value = ev.date || "";
		document.getElementById("calEventTime").value = ev.time || "09:00";
		document.getElementById("calEventDuration").value = ev.duration || "1h";
		document.getElementById("calEventDescription").value =
			ev.description || "";

		// Set color selection
		this.selectColor(ev.color || this.colorOptions[0].value);

		// Show delete button for existing events
		const deleteBtn = document.getElementById("calDeleteBtn");
		if (deleteBtn) deleteBtn.style.display = "flex";

		const modal = document.getElementById("calEventModal");
		if (modal) modal.classList.add("active");

		setTimeout(() => {
			document.getElementById("calEventTitle")?.focus();
		}, 100);
	},

	// Save event from the modal form (create or update)
	saveEvent() {
		const title = document.getElementById("calEventTitle").value.trim();
		const date = document.getElementById("calEventDate").value;
		const time = document.getElementById("calEventTime").value;
		const duration = document.getElementById("calEventDuration").value;
		const description = document
			.getElementById("calEventDescription")
			.value.trim();

		// Get selected color
		const selectedSwatch = document.querySelector(
			".cal-color-swatch.selected",
		);
		const color = selectedSwatch
			? selectedSwatch.dataset.color
			: this.colorOptions[0].value;

		// Validate
		if (!title) {
			showToast("Le titre est requis.", "error");
			return;
		}
		if (!date) {
			showToast("La date est requise.", "error");
			return;
		}

		if (this.editingEventId) {
			// Update existing event
			const ev = this.events.find((e) => e.id === this.editingEventId);
			if (ev) {
				ev.title = title;
				ev.date = date;
				ev.time = time;
				ev.duration = duration;
				ev.description = description;
				ev.color = color;
				showToast("Evenement modifie", "success");
			}
		} else {
			// Create new event
			const newId =
				this.events.length > 0
					? Math.max(...this.events.map((e) => e.id)) + 1
					: 1;

			this.events.push({
				id: newId,
				title,
				date,
				time,
				duration,
				description,
				color,
			});
			showToast("Evenement cree", "success");
		}

		this.saveEvents();
		this.closeModal();
		this.render();
	},

	// Delete the currently edited event
	deleteEvent() {
		if (!this.editingEventId) return;

		const ev = this.events.find((e) => e.id === this.editingEventId);
		if (!ev) return;

		if (!confirm("Supprimer cet evenement ?")) return;

		this.events = this.events.filter((e) => e.id !== this.editingEventId);
		this.saveEvents();
		this.closeModal();
		showToast("Evenement supprime", "success");
		this.render();
	},

	// Close the event create/edit modal
	closeModal() {
		const modal = document.getElementById("calEventModal");
		if (modal) modal.classList.remove("active");
		this.editingEventId = null;
	},

	// Close the day detail modal
	closeDayModal() {
		const modal = document.getElementById("calDayModal");
		if (modal) modal.classList.remove("active");
	},

	// Set the selected color in the color picker
	selectColor(colorValue) {
		const swatches = document.querySelectorAll(".cal-color-swatch");
		swatches.forEach((s) => {
			if (s.dataset.color === colorValue) {
				s.classList.add("selected");
			} else {
				s.classList.remove("selected");
			}
		});
	},

	// Load events from localStorage
	loadEvents() {
		const stored = localStorage.getItem("calendarEvents");
		if (stored) {
			try {
				this.events = JSON.parse(stored);
			} catch (e) {
				this.events = [];
			}
		} else {
			// Also migrate any existing meetings from the old format
			const oldMeetings = localStorage.getItem("meetings");
			if (oldMeetings) {
				try {
					const meetings = JSON.parse(oldMeetings);
					this.events = meetings.map((m, i) => {
						const d = new Date(m.date);
						return {
							id: m.id || i + 1,
							title: m.title,
							date: this.formatDateKey(d),
							time: d.toTimeString().slice(0, 5),
							duration: m.duration || "1h",
							description: m.location || "",
							color: "#4a90e2",
						};
					});
					this.saveEvents();
				} catch (e) {
					this.events = [];
				}
			} else {
				this.events = [];
			}
		}
	},

	// Persist events to localStorage
	saveEvents() {
		localStorage.setItem("calendarEvents", JSON.stringify(this.events));

		// Also keep meetings in sync for backward compatibility
		const meetings = this.events.map((ev) => ({
			id: ev.id,
			title: ev.title,
			date: new Date(ev.date + "T" + (ev.time || "09:00")).toISOString(),
			duration: ev.duration || "1h",
			participants: [],
			projectId: null,
			location: ev.description || "",
		}));
		localStorage.setItem("meetings", JSON.stringify(meetings));
	},

	// Get all events for a given Date object
	getEventsForDate(date) {
		const key = this.formatDateKey(date);
		return this.getEventsForDateStr(key);
	},

	// Get all events for a date string like "2025-03-15"
	getEventsForDateStr(dateStr) {
		return this.events
			.filter((ev) => ev.date === dateStr)
			.sort((a, b) =>
				(a.time || "00:00").localeCompare(b.time || "00:00"),
			);
	},

	// Format a Date object to "YYYY-MM-DD" string
	formatDateKey(date) {
		const y = date.getFullYear();
		const m = String(date.getMonth() + 1).padStart(2, "0");
		const d = String(date.getDate()).padStart(2, "0");
		return `${y}-${m}-${d}`;
	},

	// Escape HTML special characters to prevent XSS
	escapeHtml(str) {
		if (!str) return "";
		return str
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;");
	},
};

window.CalendarModule = CalendarModule;
