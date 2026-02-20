function showToast(message, type = "info") {
	const container = document.getElementById("toastContainer");
	if (!container) return;

	const toast = document.createElement("div");
	toast.className = `toast ${type}`;
	toast.innerHTML = `<span>${message}</span>`;
	container.appendChild(toast);
	setTimeout(() => toast.remove(), 3000);
}

// Enhanced confirm dialog
// Usage: await showConfirm(title, message, type)
// Backward compat: await showConfirm(message, type) still works
async function showConfirm(titleOrMessage, messageOrType = "info", type) {
	return new Promise((resolve) => {
		let title, message, resolvedType;

		if (type !== undefined) {
			// New signature: showConfirm(title, message, type)
			title = titleOrMessage;
			message = messageOrType;
			resolvedType = type;
		} else {
			// Old signature: showConfirm(message, type)
			title = null;
			message = titleOrMessage;
			resolvedType = messageOrType;
		}

		const modal = document.getElementById("confirmModal");
		const titleEl = document.getElementById("confirmTitle");
		const messageEl = document.getElementById("confirmMessage");
		const cancelBtn = document.getElementById("confirmCancel");
		const okBtn = document.getElementById("confirmOk");

		if (titleEl) {
			titleEl.textContent = title || "";
			titleEl.style.display = title ? "" : "none";
		}
		if (messageEl) messageEl.textContent = message;

		// Style ok button by type
		okBtn.className =
			resolvedType === "danger"
				? "btn-danger"
				: resolvedType === "warning"
					? "btn-warning"
					: "btn-primary";
		okBtn.textContent =
			resolvedType === "danger" ? "Supprimer" : "Confirmer";

		const handleOk = () => {
			cleanup();
			resolve(true);
		};
		const handleCancel = () => {
			cleanup();
			resolve(false);
		};

		const cleanup = () => {
			okBtn.removeEventListener("click", handleOk);
			cancelBtn.removeEventListener("click", handleCancel);
			modal.removeEventListener("click", handleBackdrop);
			modal.classList.remove("active");
		};

		const handleBackdrop = (e) => {
			if (e.target === modal) {
				cleanup();
				resolve(false);
			}
		};

		okBtn.addEventListener("click", handleOk);
		cancelBtn.addEventListener("click", handleCancel);
		modal.addEventListener("click", handleBackdrop);

		modal.classList.add("active");
	});
}

// ── Global Right-Click Context Menu ──────────────────────────────────────────
const ContextMenu = {
	_el: null,
	_items: [],

	show(e, items) {
		e.preventDefault();
		e.stopPropagation();
		this.hide();

		this._items = items;

		const menu = document.createElement("div");
		menu.id = "ctxMenu";
		menu.className = "ctx-menu";

		menu.innerHTML = items
			.map((item, idx) => {
				if (item.divider) return `<div class="ctx-divider"></div>`;
				return `
				<div class="ctx-item${item.danger ? " danger" : ""}${item.disabled ? " disabled" : ""}"
					onclick="ContextMenu._select(${idx})">
					${item.icon ? `<span class="ctx-icon">${item.icon}</span>` : ""}
					<span>${item.label}</span>
				</div>
			`;
			})
			.join("");

		document.body.appendChild(menu);
		this._el = menu;

		// Position
		const vw = window.innerWidth;
		const vh = window.innerHeight;
		let x = e.clientX;
		let y = e.clientY;

		menu.style.cssText = `position:fixed;left:${x}px;top:${y}px;z-index:99999;`;

		// Adjust if overflow
		requestAnimationFrame(() => {
			const rect = menu.getBoundingClientRect();
			if (rect.right > vw - 8) x = Math.max(8, vw - rect.width - 8);
			if (rect.bottom > vh - 8) y = Math.max(8, vh - rect.height - 8);
			menu.style.left = x + "px";
			menu.style.top = y + "px";
		});

		// Dismiss on outside click
		setTimeout(() => {
			document.addEventListener("click", this._globalDismiss.bind(this), {
				once: true,
			});
			document.addEventListener(
				"contextmenu",
				this._globalDismiss.bind(this),
				{ once: true },
			);
		}, 0);
	},

	_select(idx) {
		const item = this._items[idx];
		if (item && !item.disabled && item.action) item.action();
		this.hide();
	},

	_globalDismiss(e) {
		if (this._el && !this._el.contains(e.target)) this.hide();
	},

	hide() {
		if (this._el) {
			this._el.remove();
			this._el = null;
		}
		this._items = [];
	},
};

window.ContextMenu = ContextMenu;
