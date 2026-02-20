// Accounting module — financial overview focused on period analysis
const AccountingModule = {
	currentPeriod: "month",
	currentSeller: "",
	currentClient: "",
	currentProduct: "",

	// ── Shared formatters ────────────────────────────────────────────────────
	fmtEUR(v) {
		return (
			(v || 0).toLocaleString("fr-FR", {
				minimumFractionDigits: 2,
				maximumFractionDigits: 2,
			}) + " \u20AC"
		);
	},
	fmtDate(d) {
		return new Date(d).toLocaleDateString("fr-FR", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
		});
	},

	init() {
		this.render();
		this.bindEvents();
	},

	// ── Main render ─────────────────────────────────────────────────────────
	render() {
		const page = document.getElementById("accountingPage");
		if (!page) return;

		const allSales = DataManager.get("sales") || [];
		const products = DataManager.get("products") || [];
		const clients = DataManager.get("clients") || [];
		const users = DataManager.get("users") || [];
		const filtered = this.getFilteredSales(this.currentPeriod);
		const prev = this.getPreviousPeriodSales(this.currentPeriod);
		const kpis = this.computeKPIs(filtered, products);

		const sellerLabel = this.currentSeller
			? users.find((u) => String(u.id) === this.currentSeller)?.name ||
				"Vendeur"
			: "Tous";
		const clientLabel = this.currentClient
			? clients.find((c) => String(c.id) === this.currentClient)?.name ||
				"Client"
			: "Tous";
		const productLabel = this.currentProduct
			? products.find((p) => String(p.id) === this.currentProduct)
					?.name || "Produit"
			: "Tous";

		const periods = [
			{ key: "today", label: "Aujourd'hui" },
			{ key: "week", label: "Semaine" },
			{ key: "month", label: "Mois" },
			{ key: "quarter", label: "Trimestre" },
			{ key: "sixmonths", label: "6 mois" },
			{ key: "year", label: "Ann\u00e9e" },
		];

		const chev = `<svg class="filter-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>`;
		const chk = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="10" cy="10" r="8"/><polyline points="6.5 10 8.5 12 13.5 8"/></svg>`;

		page.innerHTML = `
<style>
.acct-kpi-row { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 0.9rem; margin: 1rem 0; }
.acct-kpi-card { background: var(--card-bg); border: 1.5px solid var(--border-color); border-radius: 12px; padding: 1rem 1.1rem; display: flex; flex-direction: column; gap: 0.3rem; cursor: pointer; transition: box-shadow 0.15s, transform 0.12s; }
.acct-kpi-card:hover { transform: translateY(-2px); box-shadow: 0 6px 24px rgba(10,18,35,0.12); }
.acct-kpi-label { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); }
.acct-kpi-value { font-size: 1.45rem; font-weight: 800; color: var(--text); line-height: 1.1; }
.acct-kpi-diff { font-size: 0.78rem; font-weight: 600; display: flex; align-items: center; gap: 0.25rem; }
.acct-kpi-diff.up   { color: #2d7a4f; }
.acct-kpi-diff.down { color: #dc3545; }
.acct-kpi-diff.flat { color: var(--text-muted); }
.acct-section { background: var(--card-bg); border: 1.5px solid var(--border-color); border-radius: 12px; padding: 1.1rem 1.25rem; margin-top: 1rem; overflow: hidden; }
.acct-section-title { font-size: 0.9rem; font-weight: 700; color: var(--text); display: flex; align-items: center; gap: 0.5rem; margin: 0 0 1rem; }
.acct-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem; }
@media (max-width: 860px) { .acct-two-col { grid-template-columns: 1fr; } }
.acct-chart-wrap { position: relative; width: 100%; }
.acct-chart-legend { display: flex; gap: 1rem; font-size: 0.75rem; font-weight: 600; margin-bottom: 0.6rem; flex-wrap: wrap; }
.acct-chart-legend span { display: flex; align-items: center; gap: 0.35rem; }
.acct-chart-legend i { width: 12px; height: 12px; border-radius: 3px; display: inline-block; }
.acct-tooltip { position: fixed; background: var(--card-bg); border: 1.5px solid var(--border-color); border-radius: 10px; padding: 0.65rem 0.85rem; font-size: 0.8rem; pointer-events: none; z-index: 9999; box-shadow: 0 8px 32px rgba(10,18,35,0.18); min-width: 160px; display: none; }
.acct-tooltip-title { font-weight: 700; color: var(--text); margin-bottom: 0.4rem; font-size: 0.82rem; }
.acct-tooltip-row { display: flex; justify-content: space-between; gap: 1rem; color: var(--text-secondary); margin: 0.15rem 0; }
.acct-tooltip-row strong { color: var(--text); }
.acct-seller-row { display: flex; align-items: center; gap: 0.75rem; padding: 0.65rem 0; border-bottom: 1px solid var(--border-light); cursor: pointer; }
.acct-seller-row:last-child { border-bottom: none; }
.acct-seller-row:hover { background: var(--bg-alt); margin: 0 -1.25rem; padding-left: 1.25rem; padding-right: 1.25rem; border-radius: 6px; }
.acct-seller-avatar { width: 32px; height: 32px; border-radius: 50%; background: var(--bg-alt); border: 1.5px solid var(--border-color); display: flex; align-items: center; justify-content: center; font-size: 0.85rem; flex-shrink: 0; }
.acct-seller-info { flex: 1; min-width: 0; }
.acct-seller-name { font-size: 0.875rem; font-weight: 600; color: var(--text); }
.acct-seller-meta { font-size: 0.75rem; color: var(--text-muted); }
.acct-seller-ca { font-size: 0.9rem; font-weight: 700; color: var(--text); white-space: nowrap; }
.acct-client-chip { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.3rem 0.65rem; background: var(--bg-alt); border: 1px solid var(--border-color); border-radius: 20px; font-size: 0.8rem; cursor: pointer; transition: all 0.12s; margin: 0.2rem; }
.acct-client-chip:hover { border-color: var(--accent); color: var(--accent); }
.acct-detail-panel { position: fixed; inset: 0; z-index: 15000; display: flex; align-items: center; justify-content: center; background: rgba(10,18,35,0.5); backdrop-filter: blur(4px); animation: fadeIn 0.15s; }
.acct-detail-content { background: var(--card-bg); border: 1.5px solid var(--border-color); border-radius: 16px; width: min(640px, calc(100vw - 2rem)); max-height: 80vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(10,18,35,0.2); animation: slideUp 0.2s ease; }
.acct-detail-header { padding: 1.25rem 1.5rem; border-bottom: 1.5px solid var(--border-light); display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; background: var(--card-bg); z-index: 1; }
.acct-detail-body { padding: 1.25rem 1.5rem; }
.acct-tva-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem; margin-top: 0.5rem; }
.acct-tva-q { background: var(--bg-alt); border: 1.5px solid var(--border-color); border-radius: 10px; padding: 0.75rem; text-align: center; cursor: pointer; transition: all 0.12s; }
.acct-tva-q:hover { border-color: var(--accent); }
.acct-tva-q.current { border-color: var(--accent); background: rgba(184,146,58,0.07); }
.acct-tva-q-label { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); margin-bottom: 0.3rem; }
.acct-tva-q-ttc { font-size: 1.05rem; font-weight: 800; color: var(--text); }
.acct-tva-q-tva { font-size: 0.78rem; color: var(--text-muted); margin-top: 0.1rem; }
</style>

<div class="page-header-box">
	<div class="phb-left">
		<span class="phb-icon">${Icons.get("dollarSign", 18)}</span>
		<div class="phb-text">
			<h1>Comptabilit\u00e9</h1>
			<p class="page-description">Analyse financi\u00e8re par p\u00e9riode \u2014 revenus, marges, TVA et performance vendeurs</p>
		</div>
	</div>
</div>

<!-- Period + Filters -->
<div class="filters-advanced">
	<div class="period-selector">
		${periods
			.map(
				({ key, label }) =>
					`<button class="period-btn${this.currentPeriod === key ? " active" : ""}" data-period="${key}">${label}</button>`,
			)
			.join("")}
	</div>
	<div style="width:1px;height:28px;background:var(--border-color);margin:0 0.25rem;"></div>

	<div class="filter-dropdown" id="filterSellerAcct">
		<button class="filter-btn${this.currentSeller ? " active" : ""}" onclick="AccountingModule.toggleDD('filterSellerAcct')">
			<span class="filter-btn-label">Vendeur:</span>
			<span class="filter-btn-value">${sellerLabel}</span>${chev}
		</button>
		<div class="filter-menu">
			<div class="filter-menu-item${this.currentSeller === "" ? " selected" : ""}" onclick="AccountingModule.setFilter('currentSeller','')">
				<div class="filter-check">${chk}</div><span class="filter-menu-item-label">Tous les vendeurs</span>
			</div>
			<div class="filter-menu-divider"></div>
			${users
				.filter((u) => u.active !== false)
				.map(
					(u) => `
				<div class="filter-menu-item${this.currentSeller === String(u.id) ? " selected" : ""}" onclick="AccountingModule.setFilter('currentSeller','${u.id}')">
					<div class="filter-check">${chk}</div>
					<span class="filter-user-avatar" style="font-size:0.8rem;">${u.avatar || u.name?.[0] || "?"}</span>
					<span class="filter-menu-item-label">${u.name}</span>
				</div>
			`,
				)
				.join("")}
		</div>
	</div>

	<div class="filter-dropdown" id="filterClientAcct">
		<button class="filter-btn${this.currentClient ? " active" : ""}" onclick="AccountingModule.toggleDD('filterClientAcct')">
			<span class="filter-btn-label">Client:</span>
			<span class="filter-btn-value">${clientLabel}</span>${chev}
		</button>
		<div class="filter-menu">
			<div class="filter-menu-item${this.currentClient === "" ? " selected" : ""}" onclick="AccountingModule.setFilter('currentClient','')">
				<div class="filter-check">${chk}</div><span class="filter-menu-item-label">Tous les clients</span>
			</div>
			<div class="filter-menu-divider"></div>
			${clients
				.map(
					(c) => `
				<div class="filter-menu-item${this.currentClient === String(c.id) ? " selected" : ""}" onclick="AccountingModule.setFilter('currentClient','${c.id}')">
					<div class="filter-check">${chk}</div>
					<span class="filter-menu-item-label">${c.name}</span>
				</div>
			`,
				)
				.join("")}
		</div>
	</div>

	<div class="filter-dropdown" id="filterProductAcct">
		<button class="filter-btn${this.currentProduct ? " active" : ""}" onclick="AccountingModule.toggleDD('filterProductAcct')">
			<span class="filter-btn-label">Produit:</span>
			<span class="filter-btn-value">${productLabel}</span>${chev}
		</button>
		<div class="filter-menu">
			<div class="filter-menu-item${this.currentProduct === "" ? " selected" : ""}" onclick="AccountingModule.setFilter('currentProduct','')">
				<div class="filter-check">${chk}</div><span class="filter-menu-item-label">Tous les produits</span>
			</div>
			<div class="filter-menu-divider"></div>
			${products
				.map(
					(p) => `
				<div class="filter-menu-item${this.currentProduct === String(p.id) ? " selected" : ""}" onclick="AccountingModule.setFilter('currentProduct','${p.id}')">
					<div class="filter-check">${chk}</div>
					<span class="filter-menu-item-label">${p.name}</span>
				</div>
			`,
				)
				.join("")}
		</div>
	</div>
</div>

<!-- KPI Cards -->
${this.renderKPICards(kpis, filtered, prev, products)}

<!-- Bar Chart + TVA Trimestrielle -->
<div class="acct-two-col">
	<div class="acct-section">
		<div class="acct-section-title">${Icons.get("barChart", 16)} Comparatif graphique</div>
		<div class="acct-chart-legend">
			<span><i style="background:#253868;"></i> P\u00e9riode actuelle</span>
			<span><i style="background:#dc3545;"></i> P\u00e9riode pr\u00e9c\u00e9dente</span>
			<span><i style="background:#7c3aed;"></i> Toutes p\u00e9riodes</span>
		</div>
		<div class="acct-chart-wrap">
			<canvas id="acctBarChart" height="220" style="width:100%;display:block;cursor:crosshair;"></canvas>
		</div>
	</div>
	<div class="acct-section">
		<div class="acct-section-title">${Icons.get("barChart", 16)} TVA par trimestre</div>
		${this.renderTVAQuarterly(allSales)}
	</div>
</div>

<!-- Seller Breakdown + Client Breakdown -->
<div class="acct-two-col">
	<div class="acct-section">
		<div class="acct-section-title">${Icons.get("users", 16)} Performance vendeurs</div>
		${this.renderSellerBreakdown(filtered, users, products, clients)}
	</div>
	<div class="acct-section">
		<div class="acct-section-title">${Icons.get("user", 16)} Activit\u00e9 clients</div>
		${this.renderClientBreakdown(filtered, clients, products)}
	</div>
</div>

<!-- Recent transactions -->
<div class="acct-section">
	<div class="acct-section-title">${Icons.get("clock", 16)} Transactions r\u00e9centes</div>
	${this.renderRecentTransactions(filtered, products)}
</div>

<div id="acctTooltip" class="acct-tooltip"></div>
		`;

		// Draw chart after DOM is ready
		requestAnimationFrame(() => {
			this.drawBarChart(filtered, prev, allSales);
		});
	},

	// ── KPI Cards ───────────────────────────────────────────────────────────
	renderKPICards(kpis, filtered, prev, products) {
		const prevKpis = this.computeKPIs(prev, products);

		const diff = (curr, prv) => {
			if (prv === 0 && curr === 0) return { cls: "flat", txt: "\u2014" };
			if (prv === 0) return { cls: "up", txt: "+100%" };
			const pct = ((curr - prv) / prv) * 100;
			const sign = pct >= 0 ? "+" : "";
			return {
				cls: pct >= 0 ? "up" : "down",
				txt: `${sign}${pct.toFixed(1)}%`,
			};
		};

		const pending = filtered.filter((s) => s.status === "pending").length;
		const avgSale = kpis.nbSales > 0 ? kpis.revenueTTC / kpis.nbSales : 0;
		const avgPrev =
			prevKpis.nbSales > 0 ? prevKpis.revenueTTC / prevKpis.nbSales : 0;

		// Articles vendus = qty sum across completed sales
		const soldQty = filtered
			.filter((s) => (s.status || "completed") === "completed")
			.reduce((sum, s) => sum + (s.quantity || 1), 0);
		const prevSoldQty = prev
			.filter((s) => (s.status || "completed") === "completed")
			.reduce((sum, s) => sum + (s.quantity || 1), 0);

		// Articles en stock (total stock minus sold)
		const allProducts = DataManager.get("products") || [];
		const totalStock = allProducts.reduce(
			(sum, p) => sum + (p.stock || 0),
			0,
		);

		const cards = [
			{
				label: "CA TTC",
				value: this.fmtEUR(kpis.revenueTTC),
				d: diff(kpis.revenueTTC, prevKpis.revenueTTC),
				icon: "dollarSign",
				accent: "var(--primary)",
				bg: "var(--primary-light)",
			},
			{
				label: "CA HT",
				value: this.fmtEUR(kpis.revenueHT),
				d: diff(kpis.revenueHT, prevKpis.revenueHT),
				icon: "trendingUp",
				accent: "var(--success)",
				bg: "var(--success-light)",
			},
			{
				label: "B\u00e9n\u00e9fice net (HT)",
				value: this.fmtEUR(kpis.revenueHT),
				d: diff(kpis.revenueHT, prevKpis.revenueHT),
				icon: "barChart",
				accent: "#7c3aed",
				bg: "rgba(124,58,237,0.1)",
			},
			{
				label: "TVA collect\u00e9e",
				value: this.fmtEUR(kpis.tva),
				d: diff(kpis.tva, prevKpis.tva),
				icon: "chart",
				accent: "var(--warning)",
				bg: "var(--warning-light)",
			},
			{
				label: "Articles vendus",
				value: String(soldQty),
				d: diff(soldQty, prevSoldQty),
				icon: "package",
				accent: "var(--info)",
				bg: "var(--info-light)",
			},
			{
				label: "Stock restant",
				value: String(totalStock),
				d: { cls: "flat", txt: "\u2014" },
				icon: "package",
				accent: "#64748b",
				bg: "rgba(100,116,139,0.1)",
			},
			{
				label: "Panier moyen",
				value: this.fmtEUR(avgSale),
				d: diff(avgSale, avgPrev),
				icon: "dollarSign",
				accent: "var(--accent)",
				bg: "rgba(184,146,58,0.1)",
			},
			{
				label: "En attente",
				value: String(pending),
				d: { cls: "flat", txt: `${kpis.nbSales} faites` },
				icon: "clock",
				accent: "#dc3545",
				bg: "rgba(220,53,69,0.1)",
			},
		];

		const arrowUp = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="18 15 12 9 6 15"/></svg>`;
		const arrowDown = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="6 9 12 15 18 9"/></svg>`;

		return (
			`<div class="acct-kpi-row">` +
			cards
				.map(
					(c) => `
			<div class="acct-kpi-card" onclick="AccountingModule.showKPIDetail('${c.label}')">
				<div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.2rem;">
					<div style="width:28px;height:28px;border-radius:8px;background:${c.bg};color:${c.accent};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
						${Icons.get(c.icon, 14)}
					</div>
					<span class="acct-kpi-label">${c.label}</span>
				</div>
				<div class="acct-kpi-value">${c.value}</div>
				<div class="acct-kpi-diff ${c.d.cls}">
					${c.d.cls === "up" ? arrowUp : c.d.cls === "down" ? arrowDown : ""}
					${c.d.txt} <span style="font-weight:400;color:var(--text-muted);font-size:0.72rem;margin-left:0.15rem;">vs p\u00e9riode pr\u00e9c.</span>
				</div>
			</div>
		`,
				)
				.join("") +
			`</div>`
		);
	},

	// ── Bar chart (canvas) ──────────────────────────────────────────────────
	drawBarChart(filtered, prev, allSales) {
		const canvas = document.getElementById("acctBarChart");
		if (!canvas) return;

		const ctx = canvas.getContext("2d");
		const dpr = window.devicePixelRatio || 1;
		const width = canvas.offsetWidth || 500;
		const height = 220;

		canvas.width = width * dpr;
		canvas.height = height * dpr;
		canvas.style.height = height + "px";
		ctx.scale(dpr, dpr);

		// Build daily/weekly buckets depending on period
		const label = this.currentPeriod;
		const buckets = this.buildBuckets(label, filtered, prev, allSales);

		if (buckets.length === 0) {
			ctx.fillStyle = "var(--text-muted)";
			ctx.font = "13px sans-serif";
			ctx.textAlign = "center";
			ctx.fillText("Aucune donn\u00e9e", width / 2, height / 2);
			return;
		}

		const padL = 48,
			padR = 16,
			padT = 12,
			padB = 36;
		const chartW = width - padL - padR;
		const chartH = height - padT - padB;
		const maxVal = Math.max(
			...buckets.map((b) => Math.max(b.curr, b.prev, b.all)),
			1,
		);

		const groups = buckets.length;
		const barGrpW = chartW / groups;
		const barW = Math.min(barGrpW * 0.24, 18);
		const gap = 2;

		const colors = { curr: "#253868", prev: "#dc3545", all: "#7c3aed" };

		// Y axis
		ctx.strokeStyle = "rgba(0,0,0,0.06)";
		ctx.lineWidth = 1;
		const ySteps = 4;
		for (let i = 0; i <= ySteps; i++) {
			const y = padT + chartH - (i / ySteps) * chartH;
			ctx.beginPath();
			ctx.moveTo(padL, y);
			ctx.lineTo(padL + chartW, y);
			ctx.stroke();
			const val = (maxVal / ySteps) * i;
			ctx.fillStyle = "#8a9ab5";
			ctx.font = `10px sans-serif`;
			ctx.textAlign = "right";
			ctx.fillText(
				val >= 1000 ? (val / 1000).toFixed(1) + "k" : val.toFixed(0),
				padL - 4,
				y + 3,
			);
		}

		// Draw bars + store hit areas for hover
		this._chartHits = [];

		buckets.forEach((b, i) => {
			const cx = padL + i * barGrpW + barGrpW / 2;
			const barsW = barW * 3 + gap * 2;
			const x0 = cx - barsW / 2;

			[
				["curr", colors.curr, b.curr],
				["prev", colors.prev, b.prev],
				["all", colors.all, b.all],
			].forEach(([key, color, val], j) => {
				const x = x0 + j * (barW + gap);
				const bh = (val / maxVal) * chartH;
				const y = padT + chartH - bh;
				ctx.fillStyle = color;
				ctx.globalAlpha = 0.85;
				ctx.beginPath();
				ctx.roundRect
					? ctx.roundRect(x, y, barW, bh, [3, 3, 0, 0])
					: ctx.rect(x, y, barW, bh);
				ctx.fill();
				ctx.globalAlpha = 1;
				this._chartHits.push({
					x,
					y,
					w: barW,
					h: bh,
					key,
					val,
					label: b.label,
					bucket: b,
				});
			});

			// X label
			ctx.fillStyle = "#8a9ab5";
			ctx.font = "9px sans-serif";
			ctx.textAlign = "center";
			ctx.fillText(b.label, cx, height - padB + 14);
		});

		// Hover interaction
		const tooltip = document.getElementById("acctTooltip");
		canvas.onmousemove = (e) => {
			const rect = canvas.getBoundingClientRect();
			const mx = e.clientX - rect.left;
			const my = e.clientY - rect.top;
			let hit = this._chartHits.find(
				(h) =>
					mx >= h.x &&
					mx <= h.x + h.w &&
					my >= h.y &&
					my <= h.y + h.h + 4,
			);

			if (hit) {
				const b = hit.bucket;
				const pctDiff =
					b.prev > 0
						? (((b.curr - b.prev) / b.prev) * 100).toFixed(1)
						: b.curr > 0
							? "+"
							: "\u2014";
				const diffTxt =
					b.prev > 0
						? `${parseFloat(pctDiff) >= 0 ? "+" : ""}${pctDiff}% vs pr\u00e9c.`
						: "\u2014";
				tooltip.style.display = "block";
				tooltip.style.left = e.clientX + 12 + "px";
				tooltip.style.top = e.clientY - 10 + "px";
				tooltip.innerHTML = `
					<div class="acct-tooltip-title">${b.label}</div>
					<div class="acct-tooltip-row"><span>Actuelle</span><strong style="color:#253868;">${this.fmtEUR(b.curr)}</strong></div>
					<div class="acct-tooltip-row"><span>Pr\u00e9c\u00e9dente</span><strong style="color:#dc3545;">${this.fmtEUR(b.prev)}</strong></div>
					<div class="acct-tooltip-row"><span>Globale</span><strong style="color:#7c3aed;">${this.fmtEUR(b.all)}</strong></div>
					<div style="margin-top:0.35rem;padding-top:0.35rem;border-top:1px solid var(--border-light);font-size:0.75rem;color:${parseFloat(pctDiff) >= 0 ? "#2d7a4f" : "#dc3545"};">${diffTxt}</div>
				`;
				canvas.style.cursor = "pointer";
			} else {
				tooltip.style.display = "none";
				canvas.style.cursor = "crosshair";
			}
		};
		canvas.onmouseleave = () => {
			if (tooltip) tooltip.style.display = "none";
		};
		canvas.onclick = (e) => {
			const rect = canvas.getBoundingClientRect();
			const mx = e.clientX - rect.left;
			const my = e.clientY - rect.top;
			const hit = this._chartHits.find(
				(h) =>
					mx >= h.x &&
					mx <= h.x + h.w &&
					my >= h.y &&
					my <= h.y + h.h + 4,
			);
			if (hit) this.showChartDetail(hit.bucket);
		};
	},

	buildBuckets(period, filtered, prev, allSales) {
		// Returns array of { label, curr, prev, all }
		const now = new Date();
		const completed = (s) => (s.status || "completed") === "completed";
		const ttc = (arr) =>
			arr
				.filter(completed)
				.reduce((sum, s) => sum + (s.totalTTC || 0), 0);

		// For month/week: daily buckets. For quarter+: weekly buckets. For year: monthly.
		if (period === "today") {
			// Hourly buckets for today
			const buckets = [];
			for (let h = 0; h < 24; h += 3) {
				const label = `${String(h).padStart(2, "0")}h`;
				const match = (s) => {
					const d = new Date(s.createdAt || s.date);
					return (
						d.toDateString() === now.toDateString() &&
						d.getHours() >= h &&
						d.getHours() < h + 3
					);
				};
				const prevMatch = (s) => {
					const d = new Date(s.createdAt || s.date);
					const yd = new Date(now);
					yd.setDate(yd.getDate() - 1);
					return (
						d.toDateString() === yd.toDateString() &&
						d.getHours() >= h &&
						d.getHours() < h + 3
					);
				};
				buckets.push({
					label,
					curr: ttc(filtered.filter(match)),
					prev: ttc(prev.filter(prevMatch)),
					all: ttc(allSales.filter(match)),
				});
			}
			return buckets;
		}
		if (period === "week") {
			// Daily for last 7 days
			const buckets = [];
			for (let i = 6; i >= 0; i--) {
				const d = new Date(now);
				d.setDate(now.getDate() - i);
				const dStr = d.toDateString();
				const label = d.toLocaleDateString("fr-FR", {
					weekday: "short",
					day: "numeric",
				});
				const match = (s) =>
					new Date(s.createdAt || s.date).toDateString() === dStr;
				// "prev" = same weekday 1 week earlier
				const pd = new Date(d);
				pd.setDate(pd.getDate() - 7);
				const pdStr = pd.toDateString();
				const prevMatch = (s) =>
					new Date(s.createdAt || s.date).toDateString() === pdStr;
				const allMatch = (s) => {
					const ad = new Date(s.createdAt || s.date);
					return ad.getDay() === d.getDay();
				};
				buckets.push({
					label,
					curr: ttc(filtered.filter(match)),
					prev: ttc(prev.filter(prevMatch)),
					all: ttc(allSales.filter(allMatch)),
				});
			}
			return buckets;
		}
		if (period === "month") {
			// Daily for current month
			const daysInMonth = new Date(
				now.getFullYear(),
				now.getMonth() + 1,
				0,
			).getDate();
			const buckets = [];
			for (let d = 1; d <= daysInMonth; d += 2) {
				const label = String(d);
				const match = (s) => {
					const sd = new Date(s.createdAt || s.date);
					return (
						sd.getFullYear() === now.getFullYear() &&
						sd.getMonth() === now.getMonth() &&
						sd.getDate() >= d &&
						sd.getDate() < d + 2
					);
				};
				const pm = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
				const py =
					now.getMonth() === 0
						? now.getFullYear() - 1
						: now.getFullYear();
				const prevMatch = (s) => {
					const sd = new Date(s.createdAt || s.date);
					return (
						sd.getFullYear() === py &&
						sd.getMonth() === pm &&
						sd.getDate() >= d &&
						sd.getDate() < d + 2
					);
				};
				const allMatch = (s) => {
					const sd = new Date(s.createdAt || s.date);
					return sd.getDate() >= d && sd.getDate() < d + 2;
				};
				buckets.push({
					label,
					curr: ttc(filtered.filter(match)),
					prev: ttc(prev.filter(prevMatch)),
					all: ttc(allSales.filter(allMatch)),
				});
			}
			return buckets;
		}
		if (period === "quarter" || period === "sixmonths") {
			// Weekly
			const weeks = period === "quarter" ? 13 : 26;
			const buckets = [];
			for (let w = weeks - 1; w >= 0; w--) {
				const wEnd = new Date(now);
				wEnd.setDate(wEnd.getDate() - w * 7);
				const wStart = new Date(wEnd);
				wStart.setDate(wStart.getDate() - 6);
				wStart.setHours(0, 0, 0, 0);
				const label = wStart.toLocaleDateString("fr-FR", {
					day: "2-digit",
					month: "2-digit",
				});
				const match = (s) => {
					const d = new Date(s.createdAt || s.date);
					return d >= wStart && d <= wEnd;
				};
				// prev = same window shifted back
				const pwEnd = new Date(wStart);
				pwEnd.setDate(pwEnd.getDate() - 1);
				const pwStart = new Date(pwEnd);
				pwStart.setDate(pwStart.getDate() - 6);
				const prevMatch = (s) => {
					const d = new Date(s.createdAt || s.date);
					return d >= pwStart && d <= pwEnd;
				};
				const allMatch = match;
				buckets.push({
					label,
					curr: ttc(filtered.filter(match)),
					prev: ttc(prev.filter(prevMatch)),
					all: ttc(allSales.filter(allMatch)),
				});
			}
			return buckets;
		}
		// year: monthly
		const buckets = [];
		for (let m = 11; m >= 0; m--) {
			const mo = new Date(now.getFullYear(), now.getMonth() - m, 1);
			const label = mo.toLocaleDateString("fr-FR", { month: "short" });
			const match = (s) => {
				const d = new Date(s.createdAt || s.date);
				return (
					d.getFullYear() === mo.getFullYear() &&
					d.getMonth() === mo.getMonth()
				);
			};
			const pm = new Date(mo);
			pm.setFullYear(pm.getFullYear() - 1);
			const prevMatch = (s) => {
				const d = new Date(s.createdAt || s.date);
				return (
					d.getFullYear() === pm.getFullYear() &&
					d.getMonth() === pm.getMonth()
				);
			};
			const allMatch = (s) => {
				const d = new Date(s.createdAt || s.date);
				return d.getMonth() === mo.getMonth();
			};
			buckets.push({
				label,
				curr: ttc(filtered.filter(match)),
				prev: ttc(prev.filter(prevMatch)),
				all: ttc(allSales.filter(allMatch)),
			});
		}
		return buckets;
	},

	// ── Seller breakdown ────────────────────────────────────────────────────
	renderSellerBreakdown(filtered, users, products, clients) {
		const stats = {};
		filtered
			.filter((s) => (s.status || "completed") === "completed")
			.forEach((s) => {
				const uid = s.seller || s.userId || "inconnu";
				if (!stats[uid]) stats[uid] = { ca: 0, count: 0, items: {} };
				stats[uid].ca += s.totalTTC || 0;
				stats[uid].count += 1;
				const pid = s.productId;
				if (pid)
					stats[uid].items[pid] =
						(stats[uid].items[pid] || 0) + (s.quantity || 1);
			});

		const sorted = Object.entries(stats).sort(
			([, a], [, b]) => b.ca - a.ca,
		);

		if (sorted.length === 0)
			return `<p style="color:var(--text-muted);font-size:0.875rem;">Aucune donn\u00e9e pour cette p\u00e9riode.</p>`;

		return sorted
			.map(([uid, data]) => {
				const user = users.find((u) => String(u.id) === String(uid));
				const name = user?.name || `Vendeur #${uid}`;
				const avatar = user?.avatar || name[0] || "?";
				const topItemId = Object.entries(data.items).sort(
					([, a], [, b]) => b - a,
				)[0]?.[0];
				const topItem = topItemId
					? products.find((p) => String(p.id) === String(topItemId))
							?.name || "Produit"
					: "\u2014";
				return `
				<div class="acct-seller-row" onclick="AccountingModule.showSellerDetail('${uid}')">
					<div class="acct-seller-avatar">${avatar}</div>
					<div class="acct-seller-info">
						<div class="acct-seller-name">${name}</div>
						<div class="acct-seller-meta">${data.count} vente${data.count > 1 ? "s" : ""} &middot; Top: ${topItem}</div>
					</div>
					<div class="acct-seller-ca">${this.fmtEUR(data.ca)}</div>
				</div>
			`;
			})
			.join("");
	},

	// ── Client breakdown ────────────────────────────────────────────────────
	renderClientBreakdown(filtered, clients, products) {
		const stats = {};
		filtered
			.filter((s) => (s.status || "completed") === "completed")
			.forEach((s) => {
				const cid = s.clientId || s.clientName || "inconnu";
				if (!stats[cid])
					stats[cid] = { ca: 0, count: 0, products: new Set() };
				stats[cid].ca += s.totalTTC || 0;
				stats[cid].count += 1;
				if (s.productId) stats[cid].products.add(s.productId);
			});

		const sorted = Object.entries(stats)
			.sort(([, a], [, b]) => b.ca - a.ca)
			.slice(0, 12);

		if (sorted.length === 0)
			return `<p style="color:var(--text-muted);font-size:0.875rem;">Aucun client sur cette p\u00e9riode.</p>`;

		return (
			`<div style="display:flex;flex-wrap:wrap;gap:0.2rem;">` +
			sorted
				.map(([cid, data]) => {
					const client = clients.find(
						(c) => String(c.id) === String(cid),
					);
					const name =
						client?.name || data.clientName || `Client #${cid}`;
					return `
				<div class="acct-client-chip" onclick="AccountingModule.showClientDetail('${cid}')">
					<span style="font-size:1rem;">${client?.avatar || "👤"}</span>
					<span>${name}</span>
					<span style="background:var(--accent,#b8923a);color:#fff;border-radius:10px;padding:0.1rem 0.45rem;font-size:0.7rem;font-weight:700;margin-left:0.2rem;">${this.fmtEUR(data.ca)}</span>
				</div>
			`;
				})
				.join("") +
			`</div>`
		);
	},

	// ── Recent transactions ─────────────────────────────────────────────────
	renderRecentTransactions(sales, products) {
		const recent = [...sales]
			.sort(
				(a, b) =>
					new Date(b.createdAt || b.date) -
					new Date(a.createdAt || a.date),
			)
			.slice(0, 25);
		if (recent.length === 0)
			return `<p style="color:var(--text-muted);">Aucune transaction.</p>`;

		const statusBadge = (s) => {
			const map = {
				completed: ["badge-success", "Compl\u00e9t\u00e9e"],
				pending: ["badge-warning", "En cours"],
				cancelled: ["badge-danger", "Annul\u00e9e"],
			};
			const [cls, lbl] = map[s.status || "completed"] || map.completed;
			return `<span class="badge ${cls}">${lbl}</span>`;
		};

		return (
			`<div style="overflow-x:auto;"><table class="data-table"><thead><tr>
			<th>Date</th><th>Produit</th><th>Client</th><th>Vendeur</th><th>TTC</th><th>TVA</th><th>Statut</th>
		</tr></thead><tbody>` +
			recent
				.map((s) => {
					const prod = products?.find((p) => p.id === s.productId);
					const users = DataManager.get("users") || [];
					const seller = users.find(
						(u) => String(u.id) === String(s.seller || s.userId),
					);
					return `<tr style="cursor:pointer;" onclick="AccountingModule.showTransactionDetail(${s.id})">
				<td>${this.fmtDate(s.createdAt || s.date)}</td>
				<td>${prod?.name || "Produit #" + s.productId || "\u2014"}</td>
				<td>${s.clientName || "\u2014"}</td>
				<td>${seller?.name || "\u2014"}</td>
				<td><strong>${this.fmtEUR(s.totalTTC)}</strong></td>
				<td>${this.fmtEUR((s.totalTTC || 0) - (s.totalHT || 0))}</td>
				<td>${statusBadge(s)}</td>
			</tr>`;
				})
				.join("") +
			`</tbody></table></div>`
		);
	},

	// ── TVA Quarterly ───────────────────────────────────────────────────────
	renderTVAQuarterly(sales) {
		const now = new Date();
		const year = now.getFullYear();
		const quarters = [
			{
				label: "T1",
				sublabel: "Jan\u2013Mar",
				months: [0, 1, 2],
				ttc: 0,
				tva: 0,
			},
			{
				label: "T2",
				sublabel: "Avr\u2013Jun",
				months: [3, 4, 5],
				ttc: 0,
				tva: 0,
			},
			{
				label: "T3",
				sublabel: "Jul\u2013Sep",
				months: [6, 7, 8],
				ttc: 0,
				tva: 0,
			},
			{
				label: "T4",
				sublabel: "Oct\u2013D\u00e9c",
				months: [9, 10, 11],
				ttc: 0,
				tva: 0,
			},
		];
		sales
			.filter((s) => (s.status || "completed") === "completed")
			.forEach((s) => {
				const d = new Date(s.createdAt || s.date);
				if (d.getFullYear() !== year) return;
				const q = quarters.find((q) => q.months.includes(d.getMonth()));
				if (q) {
					q.ttc += s.totalTTC || 0;
					q.tva += (s.totalTTC || 0) - (s.totalHT || 0);
				}
			});
		const currentQ = Math.floor(now.getMonth() / 3);
		return (
			`<div class="acct-tva-grid">` +
			quarters
				.map(
					(q, i) => `
			<div class="acct-tva-q${i === currentQ ? " current" : ""}" onclick="AccountingModule.showTVADetail(${i})">
				<div class="acct-tva-q-label">${q.label} ${i === currentQ ? `<span class="badge badge-warning" style="font-size:0.62rem;">En cours</span>` : ""}</div>
				<div class="acct-tva-q-ttc">${this.fmtEUR(q.ttc)}</div>
				<div class="acct-tva-q-tva">TVA: ${this.fmtEUR(q.tva)}</div>
				<div style="font-size:0.68rem;color:var(--text-muted);margin-top:0.15rem;">${q.sublabel}</div>
			</div>
		`,
				)
				.join("") +
			`</div>`
		);
	},

	// ── Detail panels (click handlers) ─────────────────────────────────────
	closeDetail() {
		const el = document.getElementById("acctDetailPanel");
		if (el) el.remove();
	},

	_showPanel(titleHTML, bodyHTML) {
		this.closeDetail();
		const panel = document.createElement("div");
		panel.id = "acctDetailPanel";
		panel.className = "acct-detail-panel";
		panel.innerHTML = `
			<div class="acct-detail-content">
				<div class="acct-detail-header">
					<div style="font-size:1rem;font-weight:700;color:var(--text);">${titleHTML}</div>
					<button onclick="AccountingModule.closeDetail()" style="background:none;border:none;cursor:pointer;font-size:1.3rem;color:var(--text-muted);padding:0.25rem;">&times;</button>
				</div>
				<div class="acct-detail-body">${bodyHTML}</div>
			</div>
		`;
		panel.addEventListener("click", (e) => {
			if (e.target === panel) this.closeDetail();
		});
		document.body.appendChild(panel);
	},

	showKPIDetail(label) {
		this._showPanel(
			label,
			`<p style="color:var(--text-muted);">D\u00e9tail de la m\u00e9trique <strong>${label}</strong> sur la p\u00e9riode s\u00e9lectionn\u00e9e.</p>`,
		);
	},

	showChartDetail(bucket) {
		const body = `
			<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.75rem;margin-bottom:1rem;">
				<div style="background:rgba(37,56,104,0.08);border-radius:10px;padding:0.8rem;text-align:center;">
					<div style="font-size:0.7rem;font-weight:700;text-transform:uppercase;color:#253868;margin-bottom:0.3rem;">Actuelle</div>
					<div style="font-size:1.1rem;font-weight:800;color:#253868;">${this.fmtEUR(bucket.curr)}</div>
				</div>
				<div style="background:rgba(220,53,69,0.08);border-radius:10px;padding:0.8rem;text-align:center;">
					<div style="font-size:0.7rem;font-weight:700;text-transform:uppercase;color:#dc3545;margin-bottom:0.3rem;">Pr\u00e9c\u00e9dente</div>
					<div style="font-size:1.1rem;font-weight:800;color:#dc3545;">${this.fmtEUR(bucket.prev)}</div>
				</div>
				<div style="background:rgba(124,58,237,0.08);border-radius:10px;padding:0.8rem;text-align:center;">
					<div style="font-size:0.7rem;font-weight:700;text-transform:uppercase;color:#7c3aed;margin-bottom:0.3rem;">Globale</div>
					<div style="font-size:1.1rem;font-weight:800;color:#7c3aed;">${this.fmtEUR(bucket.all)}</div>
				</div>
			</div>
			${
				bucket.prev > 0
					? `<p style="font-size:0.9rem;color:var(--text-secondary);">
				\u00c9volution : <strong style="color:${bucket.curr >= bucket.prev ? "#2d7a4f" : "#dc3545"};">
					${bucket.curr >= bucket.prev ? "+" : ""}${(((bucket.curr - bucket.prev) / bucket.prev) * 100).toFixed(1)}%
				</strong> par rapport \u00e0 la p\u00e9riode pr\u00e9c\u00e9dente.
			</p>`
					: ""
			}
		`;
		this._showPanel(`Analyse \u2014 ${bucket.label}`, body);
	},

	showSellerDetail(uid) {
		const allSales = DataManager.get("sales") || [];
		const products = DataManager.get("products") || [];
		const clients = DataManager.get("clients") || [];
		const users = DataManager.get("users") || [];
		const filtered = this.getFilteredSales(this.currentPeriod);
		const user = users.find((u) => String(u.id) === String(uid));
		const name = user?.name || `Vendeur #${uid}`;
		const sellerSales = filtered.filter(
			(s) =>
				String(s.seller || s.userId) === String(uid) &&
				(s.status || "completed") === "completed",
		);
		const ca = sellerSales.reduce((sum, s) => sum + (s.totalTTC || 0), 0);

		const rows = sellerSales
			.sort(
				(a, b) =>
					new Date(b.createdAt || b.date) -
					new Date(a.createdAt || a.date),
			)
			.slice(0, 20)
			.map((s) => {
				const prod = products.find((p) => p.id === s.productId);
				const client = clients.find((c) => c.id === s.clientId);
				return `<tr>
					<td>${this.fmtDate(s.createdAt || s.date)}</td>
					<td>${prod?.name || "\u2014"}</td>
					<td>${client?.name || s.clientName || "\u2014"}</td>
					<td><strong>${this.fmtEUR(s.totalTTC)}</strong></td>
				</tr>`;
			})
			.join("");

		this._showPanel(
			`${name} \u2014 ${this.fmtEUR(ca)}`,
			`
			<table class="data-table"><thead><tr><th>Date</th><th>Produit</th><th>Client</th><th>TTC</th></tr></thead>
			<tbody>${rows || "<tr><td colspan='4' style='color:var(--text-muted);'>Aucune vente</td></tr>"}</tbody></table>
		`,
		);
	},

	showClientDetail(cid) {
		const products = DataManager.get("products") || [];
		const clients = DataManager.get("clients") || [];
		const users = DataManager.get("users") || [];
		const filtered = this.getFilteredSales(this.currentPeriod);
		const client = clients.find((c) => String(c.id) === String(cid));
		const name = client?.name || `Client #${cid}`;
		const sales = filtered.filter(
			(s) =>
				String(s.clientId || s.clientName) === String(cid) &&
				(s.status || "completed") === "completed",
		);
		const ca = sales.reduce((sum, s) => sum + (s.totalTTC || 0), 0);

		const rows = sales
			.sort(
				(a, b) =>
					new Date(b.createdAt || b.date) -
					new Date(a.createdAt || a.date),
			)
			.map((s) => {
				const prod = products.find((p) => p.id === s.productId);
				const seller = users.find(
					(u) => String(u.id) === String(s.seller || s.userId),
				);
				return `<tr>
					<td>${this.fmtDate(s.createdAt || s.date)}</td>
					<td>${prod?.name || "\u2014"}</td>
					<td>${seller?.name || "\u2014"}</td>
					<td><strong>${this.fmtEUR(s.totalTTC)}</strong></td>
				</tr>`;
			})
			.join("");

		this._showPanel(
			`${name} \u2014 ${this.fmtEUR(ca)}`,
			`
			<table class="data-table"><thead><tr><th>Date</th><th>Produit</th><th>Vendeur</th><th>TTC</th></tr></thead>
			<tbody>${rows || "<tr><td colspan='4' style='color:var(--text-muted);'>Aucun achat</td></tr>"}</tbody></table>
		`,
		);
	},

	showTransactionDetail(id) {
		const allSales = DataManager.get("sales") || [];
		const products = DataManager.get("products") || [];
		const clients = DataManager.get("clients") || [];
		const users = DataManager.get("users") || [];
		const s = allSales.find((x) => x.id === id);
		if (!s) return;
		const prod = products.find((p) => p.id === s.productId);
		const client = clients.find((c) => c.id === s.clientId);
		const seller = users.find(
			(u) => String(u.id) === String(s.seller || s.userId),
		);
		const tva = (s.totalTTC || 0) - (s.totalHT || 0);
		this._showPanel(
			"Transaction #" + s.id,
			`
			<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.6rem;font-size:0.875rem;">
				<div><span style="color:var(--text-muted);">Date:</span> <strong>${this.fmtDate(s.createdAt || s.date)}</strong></div>
				<div><span style="color:var(--text-muted);">Statut:</span> <strong>${s.status || "completed"}</strong></div>
				<div><span style="color:var(--text-muted);">Produit:</span> <strong>${prod?.name || "\u2014"}</strong></div>
				<div><span style="color:var(--text-muted);">Quantit\u00e9:</span> <strong>${s.quantity || 1}</strong></div>
				<div><span style="color:var(--text-muted);">Client:</span> <strong>${client?.name || s.clientName || "\u2014"}</strong></div>
				<div><span style="color:var(--text-muted);">Vendeur:</span> <strong>${seller?.name || "\u2014"}</strong></div>
				<div><span style="color:var(--text-muted);">Montant TTC:</span> <strong>${this.fmtEUR(s.totalTTC)}</strong></div>
				<div><span style="color:var(--text-muted);">Montant HT:</span> <strong>${this.fmtEUR(s.totalHT)}</strong></div>
				<div><span style="color:var(--text-muted);">TVA:</span> <strong>${this.fmtEUR(tva)}</strong></div>
				<div><span style="color:var(--text-muted);">Plateforme:</span> <strong>${s.platform || "\u2014"}</strong></div>
			</div>
		`,
		);
	},

	showTVADetail(qIndex) {
		const labels = [
			"T1 (Janvier \u2013 Mars)",
			"T2 (Avril \u2013 Juin)",
			"T3 (Juillet \u2013 Septembre)",
			"T4 (Octobre \u2013 D\u00e9cembre)",
		];
		const now = new Date();
		const year = now.getFullYear();
		const months = [
			[0, 1, 2],
			[3, 4, 5],
			[6, 7, 8],
			[9, 10, 11],
		][qIndex];
		const allSales = DataManager.get("sales") || [];
		const qSales = allSales.filter((s) => {
			const d = new Date(s.createdAt || s.date);
			return (
				d.getFullYear() === year &&
				months.includes(d.getMonth()) &&
				(s.status || "completed") === "completed"
			);
		});
		const ttc = qSales.reduce((sum, s) => sum + (s.totalTTC || 0), 0);
		const ht = qSales.reduce((sum, s) => sum + (s.totalHT || 0), 0);
		const tva = ttc - ht;
		this._showPanel(
			labels[qIndex] + " \u2014 " + year,
			`
			<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.75rem;margin-bottom:1rem;">
				<div style="background:var(--bg-alt);border-radius:10px;padding:0.8rem;text-align:center;">
					<div style="font-size:0.7rem;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin-bottom:0.3rem;">CA TTC</div>
					<div style="font-size:1.1rem;font-weight:800;">${this.fmtEUR(ttc)}</div>
				</div>
				<div style="background:var(--bg-alt);border-radius:10px;padding:0.8rem;text-align:center;">
					<div style="font-size:0.7rem;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin-bottom:0.3rem;">CA HT</div>
					<div style="font-size:1.1rem;font-weight:800;">${this.fmtEUR(ht)}</div>
				</div>
				<div style="background:rgba(220,53,69,0.08);border-radius:10px;padding:0.8rem;text-align:center;">
					<div style="font-size:0.7rem;font-weight:700;text-transform:uppercase;color:#dc3545;margin-bottom:0.3rem;">TVA \u00e0 d\u00e9clarer</div>
					<div style="font-size:1.1rem;font-weight:800;color:#dc3545;">${this.fmtEUR(tva)}</div>
				</div>
			</div>
			<p style="font-size:0.85rem;color:var(--text-muted);">${qSales.length} transaction${qSales.length > 1 ? "s" : ""} compl\u00e9t\u00e9e${qSales.length > 1 ? "s" : ""} sur ce trimestre.</p>
		`,
		);
	},

	// ── Data helpers ─────────────────────────────────────────────────────────
	getFilteredSales(period) {
		const sales = DataManager.get("sales") || [];
		const now = new Date();
		let result;

		if (period === "today") {
			const todayStr = now.toDateString();
			result = sales.filter(
				(s) =>
					new Date(s.createdAt || s.date).toDateString() === todayStr,
			);
		} else if (period === "week") {
			const from = new Date(now);
			from.setDate(from.getDate() - 7);
			from.setHours(0, 0, 0, 0);
			result = sales.filter(
				(s) => new Date(s.createdAt || s.date) >= from,
			);
		} else if (period === "month") {
			const from = new Date(now.getFullYear(), now.getMonth(), 1);
			result = sales.filter(
				(s) => new Date(s.createdAt || s.date) >= from,
			);
		} else if (period === "quarter") {
			const from = new Date(
				now.getFullYear(),
				Math.floor(now.getMonth() / 3) * 3,
				1,
			);
			result = sales.filter(
				(s) => new Date(s.createdAt || s.date) >= from,
			);
		} else if (period === "sixmonths") {
			const from = new Date(now);
			from.setDate(from.getDate() - 180);
			from.setHours(0, 0, 0, 0);
			result = sales.filter(
				(s) => new Date(s.createdAt || s.date) >= from,
			);
		} else {
			const from = new Date(now.getFullYear(), 0, 1);
			result = sales.filter(
				(s) => new Date(s.createdAt || s.date) >= from,
			);
		}

		if (this.currentSeller)
			result = result.filter(
				(s) => String(s.seller || s.userId) === this.currentSeller,
			);
		if (this.currentClient)
			result = result.filter(
				(s) => String(s.clientId) === this.currentClient,
			);
		if (this.currentProduct)
			result = result.filter(
				(s) => String(s.productId) === this.currentProduct,
			);
		return result;
	},

	getPreviousPeriodSales(period) {
		// Returns sales for the period immediately before the current one
		const sales = DataManager.get("sales") || [];
		const now = new Date();

		let from, to;
		if (period === "today") {
			to = new Date(now.getFullYear(), now.getMonth(), now.getDate());
			from = new Date(to);
			from.setDate(from.getDate() - 1);
		} else if (period === "week") {
			to = new Date(now);
			to.setDate(to.getDate() - 7);
			from = new Date(to);
			from.setDate(from.getDate() - 7);
		} else if (period === "month") {
			to = new Date(now.getFullYear(), now.getMonth(), 1);
			from = new Date(to);
			from.setMonth(from.getMonth() - 1);
		} else if (period === "quarter") {
			const qStart = Math.floor(now.getMonth() / 3) * 3;
			to = new Date(now.getFullYear(), qStart, 1);
			from = new Date(to);
			from.setMonth(from.getMonth() - 3);
		} else if (period === "sixmonths") {
			to = new Date(now);
			to.setDate(to.getDate() - 180);
			from = new Date(to);
			from.setDate(from.getDate() - 180);
		} else {
			to = new Date(now.getFullYear(), 0, 1);
			from = new Date(now.getFullYear() - 1, 0, 1);
		}

		return sales.filter((s) => {
			const d = new Date(s.createdAt || s.date);
			return d >= from && d < to;
		});
	},

	computeKPIs(sales, products) {
		const completed = sales.filter(
			(s) => (s.status || "completed") === "completed",
		);
		const revenueTTC = completed.reduce(
			(sum, s) => sum + (s.totalTTC || 0),
			0,
		);
		const revenueHT = completed.reduce(
			(sum, s) => sum + (s.totalHT || 0),
			0,
		);
		const tva = revenueTTC - revenueHT;
		const nbSales = completed.length;
		return { revenueTTC, revenueHT, tva, nbSales };
	},

	toggleDD(id) {
		const dd = document.getElementById(id);
		if (!dd) return;
		const open = dd.classList.contains("open");
		document
			.querySelectorAll(".filter-dropdown.open")
			.forEach((d) => d.classList.remove("open"));
		if (!open) dd.classList.add("open");
	},

	setFilter(field, value) {
		this[field] = value;
		document
			.querySelectorAll(".filter-dropdown.open")
			.forEach((d) => d.classList.remove("open"));
		this.render();
		this.bindEvents();
	},

	bindEvents() {
		const page = document.getElementById("accountingPage");
		if (!page) return;
		page.querySelectorAll("[data-period]").forEach((btn) => {
			btn.addEventListener("click", () => {
				this.currentPeriod = btn.dataset.period;
				this.render();
				this.bindEvents();
			});
		});
	},
};

window.AccountingModule = AccountingModule;
