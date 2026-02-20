const DatePicker = {
	_instances: new Map(),

	// Initialize all elements with data-datepicker attribute
	initAll() {
		document.querySelectorAll("[data-datepicker]").forEach((el) => {
			if (!el._dpInitialized) this.init(el);
		});
	},

	// Wrap a single input element with the custom picker
	init(elOrSelector) {
		const input =
			typeof elOrSelector === "string"
				? document.querySelector(elOrSelector)
				: elOrSelector;
		if (!input || input._dpInitialized) return;

		input._dpInitialized = true;

		const today = new Date();
		const state = {
			year: today.getFullYear(),
			month: today.getMonth(),
			selected: null,
			input,
		};

		// Create wrapper
		const wrapper = document.createElement("div");
		wrapper.className = "dp-wrapper";
		input.parentNode.insertBefore(wrapper, input);
		wrapper.appendChild(input);

		// Trigger button
		const trigger = document.createElement("button");
		trigger.type = "button";
		trigger.className = "dp-trigger";
		trigger.innerHTML = `
			<span class="dp-trigger-icon">
				<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75" width="15" height="15">
					<rect x="3" y="4" width="14" height="13" rx="2"/>
					<line x1="7" y1="2" x2="7" y2="6"/>
					<line x1="13" y1="2" x2="13" y2="6"/>
					<line x1="3" y1="9" x2="17" y2="9"/>
				</svg>
			</span>
			<span class="dp-trigger-value placeholder">${input.placeholder || "Sélectionner une date"}</span>
		`;

		// Hide original input, insert trigger before it
		input.style.display = "none";
		wrapper.insertBefore(trigger, input);

		// Popup
		const popup = document.createElement("div");
		popup.className = "dp-popup";
		wrapper.appendChild(popup);

		// If input has a value, parse it
		if (input.value) {
			const d = new Date(input.value);
			if (!isNaN(d)) {
				state.selected = d;
				state.year = d.getFullYear();
				state.month = d.getMonth();
			}
		}

		this._renderPopup(popup, state, trigger);

		// Toggle open
		trigger.addEventListener("click", (e) => {
			e.stopPropagation();
			const isOpen = wrapper.classList.contains("open");
			// Close all other pickers
			document
				.querySelectorAll(".dp-wrapper.open")
				.forEach((w) => w.classList.remove("open"));
			if (!isOpen) wrapper.classList.add("open");
		});

		// Close on outside click
		document.addEventListener("click", (e) => {
			if (!wrapper.contains(e.target)) wrapper.classList.remove("open");
		});

		this._instances.set(input, { state, popup, trigger, wrapper });
	},

	_renderPopup(popup, state, trigger) {
		const MONTHS_FR = [
			"Janvier",
			"Février",
			"Mars",
			"Avril",
			"Mai",
			"Juin",
			"Juillet",
			"Août",
			"Septembre",
			"Octobre",
			"Novembre",
			"Décembre",
		];
		const DAYS_FR = ["L", "M", "M", "J", "V", "S", "D"];

		const today = new Date();
		today.setHours(0, 0, 0, 0);

		const firstDay = new Date(state.year, state.month, 1);
		// Monday-first: 0=Mon…6=Sun
		let startDow = (firstDay.getDay() + 6) % 7;
		const daysInMonth = new Date(state.year, state.month + 1, 0).getDate();
		const daysInPrev = new Date(state.year, state.month, 0).getDate();

		// Build day cells
		let daysHTML = "";

		// Previous month filler
		for (let i = startDow - 1; i >= 0; i--) {
			daysHTML += `<button class="dp-day other-month" type="button" data-date="${state.year}-${String(state.month).padStart(2, "0")}-${String(daysInPrev - i).padStart(2, "0")}" disabled>
				${daysInPrev - i}
			</button>`;
		}

		// Current month
		for (let d = 1; d <= daysInMonth; d++) {
			const date = new Date(state.year, state.month, d);
			date.setHours(0, 0, 0, 0);
			const isToday = date.getTime() === today.getTime();
			const isSelected =
				state.selected &&
				date.getTime() ===
					new Date(
						state.selected.getFullYear(),
						state.selected.getMonth(),
						state.selected.getDate(),
					).getTime();
			const isoDate = `${state.year}-${String(state.month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
			daysHTML += `<button
				class="dp-day${isToday ? " today" : ""}${isSelected ? " selected" : ""}"
				type="button"
				data-date="${isoDate}"
			>${d}</button>`;
		}

		// Next month filler to complete the grid (multiple of 7)
		const total = startDow + daysInMonth;
		const remainder = total % 7 === 0 ? 0 : 7 - (total % 7);
		for (let i = 1; i <= remainder; i++) {
			daysHTML += `<button class="dp-day other-month" type="button" disabled>${i}</button>`;
		}

		popup.innerHTML = `
			<div class="dp-header">
				<button class="dp-nav-btn dp-prev" type="button">
					<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
						<polyline points="13 5 7 10 13 15"/>
					</svg>
				</button>
				<span class="dp-month-label">${MONTHS_FR[state.month]} ${state.year}</span>
				<button class="dp-nav-btn dp-next" type="button">
					<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
						<polyline points="7 5 13 10 7 15"/>
					</svg>
				</button>
			</div>
			<div class="dp-weekdays">
				${DAYS_FR.map((d) => `<div class="dp-weekday">${d}</div>`).join("")}
			</div>
			<div class="dp-days">
				${daysHTML}
			</div>
			<div class="dp-footer">
				<button class="dp-shortcut" type="button" data-shortcut="today">Aujourd'hui</button>
				<button class="dp-shortcut" type="button" data-shortcut="tomorrow">Demain</button>
				<button class="dp-shortcut" type="button" data-shortcut="nextweek">+7 jours</button>
				<button class="dp-clear-btn" type="button" data-shortcut="clear">✕</button>
			</div>
		`;

		// Day click
		popup
			.querySelectorAll(".dp-day:not(.other-month):not([disabled])")
			.forEach((btn) => {
				btn.addEventListener("click", (e) => {
					e.stopPropagation();
					this._selectDate(btn.dataset.date, state, popup, trigger);
				});
			});

		// Nav buttons
		popup.querySelector(".dp-prev").addEventListener("click", (e) => {
			e.stopPropagation();
			state.month--;
			if (state.month < 0) {
				state.month = 11;
				state.year--;
			}
			this._renderPopup(popup, state, trigger);
		});

		popup.querySelector(".dp-next").addEventListener("click", (e) => {
			e.stopPropagation();
			state.month++;
			if (state.month > 11) {
				state.month = 0;
				state.year++;
			}
			this._renderPopup(popup, state, trigger);
		});

		// Shortcuts
		popup.querySelectorAll("[data-shortcut]").forEach((btn) => {
			btn.addEventListener("click", (e) => {
				e.stopPropagation();
				const sc = btn.dataset.shortcut;
				const ref = new Date();
				if (sc === "today") {
					this._selectDate(this._toISO(ref), state, popup, trigger);
				} else if (sc === "tomorrow") {
					ref.setDate(ref.getDate() + 1);
					this._selectDate(this._toISO(ref), state, popup, trigger);
				} else if (sc === "nextweek") {
					ref.setDate(ref.getDate() + 7);
					this._selectDate(this._toISO(ref), state, popup, trigger);
				} else if (sc === "clear") {
					state.selected = null;
					state.input.value = "";
					trigger.querySelector(".dp-trigger-value").textContent =
						state.input.placeholder || "Sélectionner une date";
					trigger
						.querySelector(".dp-trigger-value")
						.classList.add("placeholder");
					this._renderPopup(popup, state, trigger);
					state.input.dispatchEvent(
						new Event("change", { bubbles: true }),
					);
				}
			});
		});
	},

	_selectDate(isoString, state, popup, trigger) {
		const d = new Date(isoString + "T00:00:00");
		state.selected = d;
		state.year = d.getFullYear();
		state.month = d.getMonth();
		state.input.value = isoString;

		const valueEl = trigger.querySelector(".dp-trigger-value");
		valueEl.textContent = this._formatFR(d);
		valueEl.classList.remove("placeholder");

		this._renderPopup(popup, state, trigger);

		// Close picker
		const wrapper = trigger.closest(".dp-wrapper");
		if (wrapper) wrapper.classList.remove("open");

		state.input.dispatchEvent(new Event("change", { bubbles: true }));
		state.input.dispatchEvent(new Event("input", { bubbles: true }));
	},

	_toISO(date) {
		const y = date.getFullYear();
		const m = String(date.getMonth() + 1).padStart(2, "0");
		const d = String(date.getDate()).padStart(2, "0");
		return `${y}-${m}-${d}`;
	},

	_formatFR(date) {
		return new Intl.DateTimeFormat("fr-FR", {
			day: "numeric",
			month: "short",
			year: "numeric",
		}).format(date);
	},
};

window.DatePicker = DatePicker;

// Auto-init on DOM ready
if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", () => DatePicker.initAll());
} else {
	DatePicker.initAll();
}
