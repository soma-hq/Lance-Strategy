/**
 * DashboardModule — Personal Briefing Dashboard
 * Speaks directly to the user (tu/toi) like a friend giving a quick brief.
 */
const DashboardModule = {

	// Track live session navigation
	_sessionEvents: [],
	_sessionInterval: null,

	init() {
		this.injectStyles();
		// Register session start
		this._logSessionEvent("session", "Connexion à Lance Strategy");
		this.render();
		this.loadStats();
		// Refresh session feed every 30 seconds
		clearInterval(this._sessionInterval);
		this._sessionInterval = setInterval(() => this.refreshSessionFeed(), 30000);
	},

	// Called by Navigation.navigateTo to track page visits
	logPageVisit(pageLabel) {
		this._logSessionEvent("nav", `Page visitée : ${pageLabel}`);
		this.refreshSessionFeed();
	},

	_logSessionEvent(type, label) {
		const ts = new Date().toISOString();
		this._sessionEvents.push({ type, label, ts });
		// Also persist in sessionStorage
		try {
			const stored = JSON.parse(sessionStorage.getItem("lsSessionEvents") || "[]");
			stored.push({ type, label, ts });
			sessionStorage.setItem("lsSessionEvents", JSON.stringify(stored.slice(-30)));
		} catch (e) { /* ignore */ }
	},

	_getSessionEvents() {
		try {
			return JSON.parse(sessionStorage.getItem("lsSessionEvents") || "[]");
		} catch (e) { return []; }
	},

	refreshSessionFeed() {
		const container = document.getElementById("dbSessionStrip");
		if (!container) return;
		container.innerHTML = this.renderSessionStrip();
	},

	// ─── RENDER ────────────────────────────────────────────────────────────────

	render() {
		const page = document.getElementById("dashboardPage");
		if (!page) return;

		const currentUser = Auth?.getCurrentUser?.() || { name: "toi" };
		const firstName = (currentUser.name || "toi").split(" ")[0];

		const hour = new Date().getHours();
		const greetingEmoji = hour < 12 ? "🌅" : hour < 18 ? "☀️" : "🌙";

		const sublines = [
			"Voilà ce qui t'a attendu.",
			"Rien n'a échappé à Lance Strategy.",
			"Lance Strategy a tout gardé sous l'œil.",
			"On a tout suivi pendant ton absence.",
		];
		const subline = sublines[Math.floor(hour / 6) % sublines.length];

		// Last login badge — only if a previous session exists
		const lastLogin = currentUser.lastLogin || null;
		const lastLoginBadge = lastLogin
			? `<span class="dbp-last-login-badge">
					${Icons.get("clock", 13)}
					Dernière connexion ${this.getRelativeTime(lastLogin).toLowerCase()}
				</span>`
			: "";

		// Session strip — max 3 most recent events, compact pills
		const sessionStrip = this.renderSessionStrip();

		const absenceData = this.getAbsenceData();
		const briefCardsHTML = this.renderBriefCards(absenceData);

		page.innerHTML = `
			<div class="dbp-layout">

				<!-- GREETING HERO -->
				<header class="dbp-greeting">
					<div class="dbp-greeting-left">
						<div class="dbp-greeting-emoji">${greetingEmoji}</div>
						<div>
							<h1 class="dbp-greeting-name">Salut ${firstName}&nbsp;!</h1>
							<p class="dbp-greeting-sub">${subline}</p>
						</div>
					</div>
					${lastLoginBadge ? `<div class="dbp-greeting-meta">${lastLoginBadge}</div>` : ""}
				</header>

				<!-- SESSION STRIP (compact, inline) -->
				${sessionStrip ? `
				<div class="dbp-session-strip" id="dbSessionStrip">
					${sessionStrip}
				</div>` : ""}

				<!-- QUICK STATS ROW -->
				<section class="dbp-stats-row">
					<div class="dbp-stat-card" id="dbStatTaskCard">
						<div class="dbp-stat-top">
							<div class="dbp-stat-icon" id="dbStatTasksIcon" style="color: var(--warning);">${Icons.get("alertCircle", 18)}</div>
							<div class="dbp-stat-numbers">
								<span class="dbp-stat-value" id="dbStatOverdue">—</span>
								<span class="dbp-stat-context" id="dbStatOverdueCtx"></span>
							</div>
						</div>
						<span class="dbp-stat-label">Tâches en retard</span>
						<button class="dbp-stat-cta" onclick="Navigation.navigateTo('tasks')">Voir les tâches →</button>
					</div>
					<div class="dbp-stat-card">
						<div class="dbp-stat-top">
							<div class="dbp-stat-icon" style="color: var(--success);">${Icons.get("trendingUp", 18)}</div>
							<div class="dbp-stat-numbers">
								<span class="dbp-stat-value" id="dbStatSalesCount">—</span>
								<span class="dbp-stat-context" id="dbStatRevenue"></span>
							</div>
						</div>
						<span class="dbp-stat-label">Ventes ce mois</span>
						<button class="dbp-stat-cta" onclick="Navigation.navigateTo('sales')">Voir les ventes →</button>
					</div>
					<div class="dbp-stat-card" id="dbStatStockCard">
						<div class="dbp-stat-top">
							<div class="dbp-stat-icon" id="dbStatStockIcon" style="color: var(--text-muted);">${Icons.get("box", 18)}</div>
							<div class="dbp-stat-numbers">
								<span class="dbp-stat-value" id="dbStatLowStock">—</span>
								<span class="dbp-stat-context">sous le seuil</span>
							</div>
						</div>
						<span class="dbp-stat-label">Stock à surveiller</span>
						<button class="dbp-stat-cta" onclick="Navigation.navigateTo('products')">Voir le stock →</button>
					</div>
					<div class="dbp-stat-card">
						<div class="dbp-stat-top">
							<div class="dbp-stat-icon" style="color: var(--info);">${Icons.get("folder", 18)}</div>
							<div class="dbp-stat-numbers">
								<span class="dbp-stat-value" id="dbStatProjects">—</span>
								<span class="dbp-stat-context" id="dbStatDeadlineSub"></span>
							</div>
						</div>
						<span class="dbp-stat-label">Projets actifs</span>
						<button class="dbp-stat-cta" onclick="Navigation.navigateTo('projects')">Voir les projets →</button>
					</div>
				</section>

				<!-- ACTIVITY BRIEF (full width) -->
				<section class="dbp-brief-section">
					<div class="dbp-section-header">
						<span class="dbp-section-label">${Icons.get("bell", 14)} Ce que tu as manqué</span>
					</div>
					<div class="dbp-brief-feed">
						${briefCardsHTML}
					</div>
				</section>

			</div>
		`;
	},

	// ─── SESSION FEED ──────────────────────────────────────────────────────────

	renderSessionFeed() {
		const events = this._getSessionEvents();
		if (events.length === 0) {
			return `<p class="dbp-empty-note" style="padding: 0.75rem 0;">Session démarrée. Navigue pour voir ton activité ici.</p>`;
		}

		const typeConfig = {
			session: { emoji: "🔑", color: "var(--primary)" },
			nav:     { emoji: "→",  color: "var(--text-muted)" },
			create:  { emoji: "✚",  color: "var(--success)" },
			edit:    { emoji: "✎",  color: "var(--warning)" },
			delete:  { emoji: "✕",  color: "var(--danger)" },
		};

		return [...events].reverse().slice(0, 12).map(ev => {
			const cfg = typeConfig[ev.type] || typeConfig.nav;
			const timeStr = this.getRelativeTime(ev.ts);
			return `
				<div class="dbp-session-row">
					<span class="dbp-session-dot" style="color: ${cfg.color};">${cfg.emoji}</span>
					<span class="dbp-session-label">${ev.label}</span>
					<span class="dbp-session-time">${timeStr}</span>
				</div>
			`;
		}).join("");
	},



	// Compact session breadcrumb strip — shows page trail
	renderSessionStrip() {
		const events = this._getSessionEvents();
		if (events.length === 0) return "";

		// Session age from first event
		const sessionStart = events[0];
		const sessionAgeMs = Date.now() - new Date(sessionStart.ts).getTime();
		const sessionAgeMin = Math.floor(sessionAgeMs / 60000);
		const ageLabel = sessionAgeMin < 1 ? "à l'instant"
			: sessionAgeMin < 60 ? `il y a ${sessionAgeMin} min`
			: `il y a ${Math.floor(sessionAgeMin / 60)}h`;

		// Build deduped page trail from nav events
		const navEvents = events.filter(e => e.type === "nav");
		const pageNames = navEvents.map(e => e.label.replace(/^Page visitée\s*:\s*/i, ""));
		// Deduplicate consecutive + keep last 5
		const trail = pageNames.filter((p, i) => i === 0 || p !== pageNames[i - 1]).slice(-5);

		const trailHTML = trail.length > 0
			? trail.map((p, i) => `<span class="dbp-trail-item">${p}</span>${i < trail.length - 1 ? '<span class="dbp-trail-sep">›</span>' : ""}`).join("")
			: "";

		return `<span class="dbp-session-age">${ageLabel}</span>${trailHTML ? '<span class="dbp-trail-sep">·</span>' + trailHTML : ""}`;
	},

	renderBriefCards(absenceData) {
		if (!absenceData.hasUpdates || absenceData.items.length === 0) {
			const recentSalesHTML = this.renderRecentSalesInline();
			return `
				<div class="dbp-brief-card dbp-brief-card--calm">
					<div class="dbp-brief-dot" style="background: var(--bg-alt);">😌</div>
					<div class="dbp-brief-body">
						<p class="dbp-brief-text">Tout est calme. <strong>Rien de nouveau</strong> depuis hier.</p>
						<span class="dbp-brief-time">Maintenant</span>
					</div>
				</div>
				${recentSalesHTML}
			`;
		}

		return absenceData.items.map(item => {
			const linkHTML = item.navTarget
				? `<button
						class="btn-secondary dbp-brief-link"
						onclick="Navigation.navigateTo('${item.navTarget}')"
					>Voir →</button>`
				: "";

			return `
				<div class="dbp-brief-card dbp-brief-card--${item.type}">
					<div class="dbp-brief-dot" style="background: ${item.dotBg};">${item.emoji}</div>
					<div class="dbp-brief-body">
						<p class="dbp-brief-text">${item.html}</p>
						<span class="dbp-brief-time">${item.time}</span>
					</div>
					${linkHTML}
				</div>
			`;
		}).join("");
	},

	// ─── DATA: ABSENCE / ACTIVITY ──────────────────────────────────────────────

	getAbsenceData() {
		const data = DataManager.getData();
		const currentUser = Auth?.getCurrentUser?.();
		if (!currentUser) return { hasUpdates: false, totalCount: 0, items: [] };

		const items = [];
		const now = Date.now();
		const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

		// ── Recent sales ──────────────────────────────────
		const sales = data.sales || [];
		const recentSales = sales.filter(s => {
			if (!s.date) return false;
			return (now - new Date(s.date).getTime()) <= sevenDaysMs;
		});
		if (recentSales.length > 0) {
			const total = recentSales.reduce((sum, s) => sum + (s.total || 0), 0);
			const n = recentSales.length;
			items.push({
				type: "sale",
				emoji: "💰",
				dotBg: "var(--success-light)",
				html: `<strong>${n} vente${n > 1 ? "s" : ""}</strong> ont été enregistrées depuis ta dernière visite — <strong>+${this.formatCurrency(total)} de CA</strong>`,
				time: "Cette semaine",
				navTarget: "sales",
			});
		}

		// ── Open tasks + overdue ──────────────────────────
		const tasks = data.tasks || [];
		const openTasks = tasks.filter(t => t.status !== "done" && t.status !== "cancelled");
		const overdueTasks = openTasks.filter(t => {
			if (!t.dueDate) return false;
			return new Date(t.dueDate).getTime() < now;
		});
		if (openTasks.length > 0) {
			const n = openTasks.length;
			const od = overdueTasks.length;
			const overdueText = od > 0
				? ` — dont <strong>${od} en retard</strong>`
				: "";
			items.push({
				type: "task",
				emoji: "✅",
				dotBg: "var(--info-light)",
				html: `Tu as <strong>${n} tâche${n > 1 ? "s" : ""}</strong> qui t'attend${n > 1 ? "ent" : ""}${overdueText}.`,
				time: "En ce moment",
				navTarget: "tasks",
			});
		}

		// ── New projects assigned to current user ─────────
		const projects = data.projects || [];
		const recentProjects = projects.filter(p => {
			if (!p.createdAt) return false;
			return (now - new Date(p.createdAt).getTime()) <= sevenDaysMs
				&& p.members?.includes(currentUser.username);
		});
		recentProjects.forEach(project => {
			items.push({
				type: "project",
				emoji: "🚀",
				dotBg: "var(--primary-purple-light)",
				html: `Tu as été ajouté au projet <strong>${project.name}</strong>.`,
				time: this.getRelativeTime(project.createdAt),
				navTarget: "projects",
			});
		});

		// ── Low stock products ────────────────────────────
		const products = data.products || [];
		const lowStock = products.filter(p => {
			const total = Object.values(p.stock || {}).reduce((s, q) => s + q, 0);
			return total < 5 && total > 0;
		});
		if (lowStock.length > 0) {
			const first = lowStock[0];
			const extra = lowStock.length - 1;
			const extraText = extra > 0
				? ` et <strong>${extra} autre${extra > 1 ? "s" : ""}</strong>`
				: "";
			items.push({
				type: "stock",
				emoji: "📦",
				dotBg: "var(--warning-light)",
				html: `Le stock de <strong>"${first.name}"</strong>${extraText} est presque vide.`,
				time: "Maintenant",
				navTarget: "products",
			});
		}

		return {
			hasUpdates: items.length > 0,
			totalCount: items.length,
			items: items.slice(0, 5),
		};
	},

	// ─── STATS ─────────────────────────────────────────────────────────────────

	loadStats() {
		const data = DataManager.getData();
		const now = new Date();
		const nowTs = now.getTime();
		const cm = now.getMonth();
		const cy = now.getFullYear();

		// ── Monthly sales + revenue ────────────────────────────────────────────
		const sales = data.sales || [];
		const monthlySales = sales.filter(s => {
			if (!s.date) return false;
			const d = new Date(s.date);
			return d.getMonth() === cm && d.getFullYear() === cy;
		});
		const monthlyRevenue = monthlySales.reduce((sum, s) => sum + (s.total || 0), 0);
		this.updateStat("dbStatSalesCount", monthlySales.length.toString());
		this.updateStat("dbStatRevenue", this.formatCurrency(monthlyRevenue));

		// ── Overdue tasks ─────────────────────────────────────────────────────
		const tasks = data.tasks || [];
		const openTasks = tasks.filter(t => !t.completed && t.status !== "done" && t.status !== "cancelled");
		const overdueTasks = openTasks.filter(t => t.dueDate && new Date(t.dueDate).getTime() < nowTs);
		this.updateStat("dbStatOverdue", overdueTasks.length.toString());
		this.updateStat("dbStatOverdueCtx", openTasks.length > 0 ? `${openTasks.length} ouvertes` : "");
		// Color the icon and card red if overdue > 0
		const taskIcon = document.getElementById("dbStatTasksIcon");
		if (taskIcon) taskIcon.style.color = overdueTasks.length > 0 ? "var(--danger)" : "var(--success)";

		// ── Low stock products ───────────────────────────────────────────────
		const products = data.products || [];
		const lowStockProducts = products.filter(p => {
			const total = Object.values(p.stock || {}).reduce((s, q) => s + q, 0);
			const threshold = p.alertThreshold || 10;
			return total <= threshold;
		});
		this.updateStat("dbStatLowStock", lowStockProducts.length.toString());
		const stockIcon = document.getElementById("dbStatStockIcon");
		if (stockIcon) stockIcon.style.color = lowStockProducts.length > 0 ? "var(--warning)" : "var(--success)";

		// ── Active projects + deadline this week ─────────────────────────────────────
		const projects = data.projects || [];
		const activeProjects = projects.filter(p =>
			p.status !== "done" && p.status !== "archived" && p.status !== "cancelled"
		);
		const weekMs = 7 * 24 * 60 * 60 * 1000;
		const dueSoon = activeProjects.filter(p => p.deadline && new Date(p.deadline).getTime() - nowTs < weekMs && new Date(p.deadline).getTime() >= nowTs);
		this.updateStat("dbStatProjects", activeProjects.length.toString());
		this.updateStat("dbStatDeadlineSub", dueSoon.length > 0 ? `${dueSoon.length} deadline cette semaine` : "");
	},

	// ─── RECENT SALES (inline HTML, shown below calm card) ─────────────────────

	renderRecentSalesInline() {
		const sales = DataManager.get("sales") || [];
		const sorted = [...sales]
			.filter(s => s.date)
			.sort((a, b) => new Date(b.date) - new Date(a.date))
			.slice(0, 5);

		if (sorted.length === 0) return "";

		const rows = sorted.map(sale => {
			const dateStr = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" }).format(new Date(sale.date));
			const product = sale.product || sale.productName || sale.items?.[0]?.productName || "—";
			const amount = this.formatCurrency(sale.total || 0);
			return `
				<div class="dbp-sale-row">
					<span class="dbp-sale-date">${dateStr}</span>
					<span class="dbp-sale-product">${product}</span>
					<span class="dbp-sale-amount">${amount}</span>
				</div>
			`;
		}).join("");

		return `
			<div class="dbp-recent-inline">
				<div class="dbp-recent-header">
					<span class="dbp-recent-title">${Icons.get("shoppingCart", 13)} Dernières ventes</span>
					<button class="btn-secondary dbp-recent-link" onclick="Navigation.navigateTo('sales')">Tout voir →</button>
				</div>
				<div class="dbp-recent-list">${rows}</div>
			</div>
		`;
	},


	renderRecentSales(sales) {
		const container = document.getElementById("dbRecentSales");
		if (!container) return;

		if (!sales || sales.length === 0) {
			container.innerHTML = `<p class="dbp-empty-note">Aucune vente enregistrée pour le moment.</p>`;
			return;
		}

		const sorted = [...sales]
			.filter(s => s.date)
			.sort((a, b) => new Date(b.date) - new Date(a.date))
			.slice(0, 5);

		if (sorted.length === 0) {
			container.innerHTML = `<p class="dbp-empty-note">Aucune vente récente.</p>`;
			return;
		}

		container.innerHTML = sorted.map(sale => {
			const dateStr = new Intl.DateTimeFormat("fr-FR", {
				day: "2-digit",
				month: "short",
			}).format(new Date(sale.date));
			const product = sale.product || sale.productName || sale.items?.[0]?.productName || "—";
			const amount = this.formatCurrency(sale.total || 0);
			return `
				<div class="dbp-sale-row">
					<span class="dbp-sale-date">${dateStr}</span>
					<span class="dbp-sale-product">${product}</span>
					<span class="dbp-sale-amount">${amount}</span>
				</div>
			`;
		}).join("");
	},

	// ─── UTILITIES ─────────────────────────────────────────────────────────────

	updateStat(id, value) {
		const el = document.getElementById(id);
		if (el) el.textContent = value;
	},

	getRelativeTime(dateString) {
		if (!dateString) return "Récemment";
		const daysAgo = Math.floor(
			(Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24)
		);
		if (daysAgo === 0) return "Aujourd'hui";
		if (daysAgo === 1) return "Hier";
		if (daysAgo < 7) return `Il y a ${daysAgo} jours`;
		return "Cette semaine";
	},

	formatCurrency(amount) {
		return new Intl.NumberFormat("fr-FR", {
			style: "currency",
			currency: "EUR",
		}).format(amount);
	},

	// ─── STYLE INJECTION ───────────────────────────────────────────────────────

	injectStyles() {
		const id = "dbp-styles";
		if (document.getElementById(id)) return;
		const style = document.createElement("style");
		style.id = id;
		style.textContent = this.getStyles();
		document.head.appendChild(style);
	},

	getStyles() {
		return `
			.dbp-layout {
				display: flex;
				flex-direction: column;
				gap: 1.5rem;
				padding-bottom: 3rem;
			}

			/* ── Greeting Hero ─────────────────────────────────── */
			.dbp-greeting {
				display: flex;
				align-items: center;
				justify-content: space-between;
				gap: 1.5rem;
				padding: 1.75rem 2rem;
				background: var(--card-bg);
				border-radius: var(--radius-lg);
				border: 1.5px solid var(--border-color);
				box-shadow: var(--manga-shadow);
				flex-wrap: wrap;
			}
			.dbp-greeting-left {
				display: flex;
				align-items: center;
				gap: 1rem;
			}
			.dbp-greeting-emoji {
				font-size: 2.4rem;
				line-height: 1;
				flex-shrink: 0;
			}
			.dbp-greeting-name {
				font-size: 2rem;
				font-weight: 800;
				color: var(--text);
				margin: 0 0 0.2rem;
				line-height: 1.1;
				letter-spacing: -0.02em;
			}
			.dbp-greeting-sub {
				font-size: 0.95rem;
				color: var(--text-muted);
				margin: 0;
				font-style: italic;
			}
			.dbp-greeting-meta { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
			.dbp-last-login-badge {
				display: inline-flex;
				align-items: center;
				gap: 0.4rem;
				font-size: 0.8rem;
				color: var(--text-secondary);
				background: var(--bg-alt);
				border: 1px solid var(--border-light);
				border-radius: var(--radius);
				padding: 0.4rem 0.85rem;
				white-space: nowrap;
			}
			.dbp-last-login-badge svg { opacity: 0.6; }

			/* ── Section Headers ───────────────────────────────── */
			.dbp-section-header {
				display: flex;
				align-items: center;
				margin-bottom: 0.75rem;
			}
			.dbp-section-label {
				display: inline-flex;
				align-items: center;
				gap: 0.4rem;
				font-size: 0.72rem;
				font-weight: 700;
				color: var(--text-muted);
				text-transform: uppercase;
				letter-spacing: 0.07em;
			}
			.dbp-section-label svg { opacity: 0.6; }

			/* ── Quick Stats Row ───────────────────────────────── */
			.dbp-stats-row {
				display: grid;
				grid-template-columns: repeat(4, 1fr);
				gap: 0.75rem;
			}
			@media (max-width: 720px) { .dbp-stats-row { grid-template-columns: repeat(2, 1fr); } }
			@media (max-width: 420px) { .dbp-stats-row { grid-template-columns: 1fr; } }
			.dbp-stat-card {
				background: var(--card-bg);
				border: 1.5px solid var(--border-color);
				border-radius: var(--radius-md);
				padding: 1rem 1.2rem;
				display: flex;
				flex-direction: column;
				gap: 0.25rem;
				transition: box-shadow 0.15s, transform 0.15s;
			}
			.dbp-stat-card:hover { transform: translate(-1px, -1px); box-shadow: var(--manga-shadow); }
			.dbp-stat-top {
				display: flex;
				align-items: flex-start;
				gap: 0.75rem;
				margin-bottom: 0.35rem;
			}
			.dbp-stat-icon { line-height: 1; opacity: 0.9; flex-shrink: 0; padding-top: 0.2rem; transition: color 0.2s; }
			.dbp-stat-numbers { display: flex; flex-direction: column; gap: 0.05rem; }
			.dbp-stat-value {
				font-size: 1.65rem;
				font-weight: 800;
				color: var(--text);
				line-height: 1.1;
				letter-spacing: -0.03em;
			}
			.dbp-stat-context {
				font-size: 0.72rem;
				color: var(--text-muted);
				font-weight: 500;
				font-style: italic;
			}
			.dbp-stat-label {
				font-size: 0.72rem;
				color: var(--text-secondary);
				text-transform: uppercase;
				letter-spacing: 0.04em;
				font-weight: 600;
				margin-top: 0.1rem;
			}
			.dbp-stat-cta {
				display: inline-flex;
				align-items: center;
				gap: 0.3rem;
				margin-top: 0.6rem;
				padding: 0.3rem 0;
				background: none;
				border: none;
				border-bottom: 1.5px solid var(--border-color);
				border-radius: 0;
				font-size: 0.72rem;
				font-weight: 600;
				color: var(--text-secondary);
				cursor: pointer;
				font-family: inherit;
				letter-spacing: 0.02em;
				transition: color 0.12s, border-color 0.12s;
				text-align: left;
			}
			.dbp-stat-cta:hover { color: var(--text); border-color: var(--text); }

			/* ── Brief section ──────────────────────────────────── */
			.dbp-brief-section { display: flex; flex-direction: column; gap: 0.5rem; }
			.dbp-brief-feed { display: flex; flex-direction: column; gap: 0.5rem; }
			.dbp-brief-card {
				display: flex;
				align-items: center;
				gap: 0.9rem;
				background: var(--card-bg);
				border-radius: var(--radius-md);
				padding: 0.9rem 1rem;
				border: 1.5px solid var(--border-color);
				border-left-width: 3px;
				transition: background var(--transition-fast);
			}
			.dbp-brief-card:hover { background: var(--hover-bg); }
			.dbp-brief-card--sale    { border-left-color: var(--success); }
			.dbp-brief-card--task    { border-left-color: var(--primary); }
			.dbp-brief-card--project { border-left-color: var(--info); }
			.dbp-brief-card--stock   { border-left-color: var(--warning); }
			.dbp-brief-card--calm    { border-left-color: var(--border-dark); }
			.dbp-brief-dot {
				display: flex; align-items: center; justify-content: center;
				width: 2.2rem; height: 2.2rem; border-radius: 50%;
				font-size: 1rem; flex-shrink: 0;
			}
			.dbp-brief-body { flex: 1; min-width: 0; }
			.dbp-brief-text { margin: 0 0 0.2rem; font-size: 0.88rem; color: var(--text); line-height: 1.5; }
			.dbp-brief-text strong { font-weight: 600; }
			.dbp-brief-time { font-size: 0.73rem; color: var(--text-muted); }
			.dbp-brief-link {
				flex-shrink: 0; font-size: 0.78rem !important;
				padding: 0.25rem 0.6rem !important; cursor: pointer; white-space: nowrap;
			}

			/* ── Session strip (breadcrumb trail) ───────────────────── */
			.dbp-session-strip {
				display: flex;
				align-items: center;
				gap: 0.4rem;
				flex-wrap: wrap;
				padding: 0.55rem 1rem;
				background: var(--card-bg);
				border: 1.5px solid var(--border-light);
				border-radius: var(--radius-md);
				font-size: 0.76rem;
			}
			.dbp-session-age {
				color: var(--text-muted);
				font-size: 0.73rem;
				font-weight: 500;
				white-space: nowrap;
				font-style: italic;
			}
			.dbp-trail-item {
				color: var(--text-secondary);
				font-size: 0.76rem;
				font-weight: 500;
				white-space: nowrap;
			}
			.dbp-trail-sep {
				color: var(--border-dark);
				font-size: 0.7rem;
				flex-shrink: 0;
			}

			/* ── Recent sales (inline below calm card) ───────────── */
			.dbp-recent-inline {
				background: var(--card-bg);
				border: 1.5px solid var(--border-color);
				border-radius: var(--radius-md);
				overflow: hidden;
				margin-top: 0.25rem;
			}
			.dbp-recent-header {
				display: flex; align-items: center; justify-content: space-between;
				padding: 0.65rem 1rem;
				border-bottom: 1px solid var(--border-light);
			}
			.dbp-recent-title {
				display: inline-flex; align-items: center; gap: 0.4rem;
				font-size: 0.7rem; font-weight: 600; color: var(--text-secondary);
				text-transform: uppercase; letter-spacing: 0.05em;
			}
			.dbp-recent-link { font-size: 0.75rem !important; padding: 0.2rem 0.55rem !important; cursor: pointer; }
			.dbp-recent-list { display: flex; flex-direction: column; }
			.dbp-sale-row {
				display: grid; grid-template-columns: 4rem 1fr auto;
				gap: 1rem; align-items: center;
				padding: 0.55rem 1rem;
				border-bottom: 1px solid var(--border-light);
				font-size: 0.85rem;
			}
			.dbp-sale-row:last-child { border-bottom: none; }
			.dbp-sale-date { color: var(--text-muted); font-size: 0.75rem; white-space: nowrap; }
			.dbp-sale-product { color: var(--text); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
			.dbp-sale-amount { color: var(--success); font-weight: 600; font-size: 0.82rem; white-space: nowrap; }
			.dbp-empty-note { padding: 1rem; color: var(--text-muted); font-size: 0.875rem; margin: 0; }

			@media (max-width: 600px) {
				.dbp-greeting { flex-direction: column; align-items: flex-start; padding: 1.25rem; }
				.dbp-greeting-name { font-size: 1.6rem; }
			}
		`;
	},

};

window.DashboardModule = DashboardModule;
