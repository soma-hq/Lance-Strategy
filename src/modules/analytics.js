// Analytics module — product & market intelligence
const AnalyticsModule = {
	currentPeriod: "month",
	currentView: "products", // "products" | "clients" | "platforms"

	fmt(v) {
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
		const page = document.getElementById("analyticsPage");
		if (!page) return;

		const allSales = DataManager.get("sales") || [];
		const products = DataManager.get("products") || [];
		const clients = DataManager.get("clients") || [];
		const users = DataManager.get("users") || [];
		const filtered = this.getFilteredSales(this.currentPeriod, allSales);

		const periods = [
			{ key: "today", label: "Aujourd'hui" },
			{ key: "week", label: "Semaine" },
			{ key: "month", label: "Mois" },
			{ key: "quarter", label: "Trimestre" },
			{ key: "sixmonths", label: "6 mois" },
			{ key: "year", label: "Ann\u00e9e" },
		];

		const views = [
			{ key: "products", label: "Produits", icon: "package" },
			{ key: "clients", label: "Clients", icon: "users" },
			{ key: "platforms", label: "Plateformes", icon: "chart" },
		];

		page.innerHTML = `
<style>
.anly-kpi-row { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 0.85rem; margin: 1rem 0; }
.anly-kpi { background: var(--card-bg); border: 1.5px solid var(--border-color); border-radius: 12px; padding: 0.9rem 1rem; display: flex; flex-direction: column; gap: 0.25rem; cursor: pointer; transition: transform 0.12s, box-shadow 0.15s; }
.anly-kpi:hover { transform: translateY(-2px); box-shadow: 0 6px 24px rgba(10,18,35,0.12); }
.anly-kpi-label { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); }
.anly-kpi-value { font-size: 1.3rem; font-weight: 800; color: var(--text); line-height: 1.1; }
.anly-kpi-sub { font-size: 0.76rem; color: var(--text-muted); }
.anly-section { background: var(--card-bg); border: 1.5px solid var(--border-color); border-radius: 12px; padding: 1.1rem 1.25rem; margin-top: 1rem; overflow: hidden; }
.anly-section-title { font-size: 0.9rem; font-weight: 700; color: var(--text); display: flex; align-items: center; gap: 0.5rem; margin: 0 0 1rem; }
.anly-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem; }
@media (max-width: 860px) { .anly-two-col { grid-template-columns: 1fr; } }
.anly-bar-row { display: flex; align-items: center; gap: 0.65rem; padding: 0.45rem 0; cursor: pointer; transition: background 0.1s; border-radius: 6px; }
.anly-bar-row:hover { background: var(--bg-alt); margin: 0 -0.75rem; padding-left: 0.75rem; padding-right: 0.75rem; }
.anly-bar-rank { width: 20px; font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-align: right; flex-shrink: 0; }
.anly-bar-label { flex: 1; font-size: 0.85rem; font-weight: 600; color: var(--text); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.anly-bar-track { width: 120px; height: 8px; background: var(--bg-alt); border-radius: 4px; overflow: hidden; flex-shrink: 0; }
.anly-bar-fill { height: 100%; border-radius: 4px; transition: width 0.5s ease; }
.anly-bar-value { font-size: 0.82rem; font-weight: 700; color: var(--text); white-space: nowrap; min-width: 48px; text-align: right; }
.anly-bar-count { font-size: 0.72rem; color: var(--text-muted); white-space: nowrap; min-width: 36px; text-align: right; }
.anly-platform-card { padding: 0.85rem 1rem; background: var(--bg-alt); border: 1.5px solid var(--border-color); border-radius: 10px; display: flex; flex-direction: column; gap: 0.4rem; cursor: pointer; transition: all 0.12s; }
.anly-platform-card:hover { border-color: var(--accent); transform: translateY(-1px); }
.anly-platform-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 0.75rem; }
.anly-tooltip { position: fixed; background: var(--card-bg); border: 1.5px solid var(--border-color); border-radius: 10px; padding: 0.65rem 0.85rem; font-size: 0.8rem; pointer-events: none; z-index: 9999; box-shadow: 0 8px 32px rgba(10,18,35,0.18); min-width: 180px; display: none; }
.anly-tooltip-title { font-weight: 700; color: var(--text); margin-bottom: 0.4rem; font-size: 0.82rem; }
.anly-tooltip-row { display: flex; justify-content: space-between; gap: 1rem; color: var(--text-secondary); margin: 0.1rem 0; }
.anly-tooltip-row strong { color: var(--text); }
.anly-detail-panel { position: fixed; inset: 0; z-index: 15000; display: flex; align-items: center; justify-content: center; background: rgba(10,18,35,0.5); backdrop-filter: blur(4px); animation: fadeIn 0.15s; }
.anly-detail-content { background: var(--card-bg); border: 1.5px solid var(--border-color); border-radius: 16px; width: min(680px, calc(100vw - 2rem)); max-height: 82vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(10,18,35,0.2); animation: slideUp 0.2s ease; }
.anly-detail-header { padding: 1.25rem 1.5rem; border-bottom: 1.5px solid var(--border-light); display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; background: var(--card-bg); z-index: 1; }
.anly-detail-body { padding: 1.25rem 1.5rem; }
.anly-trend-chip { display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.73rem; font-weight: 700; padding: 0.15rem 0.45rem; border-radius: 12px; }
.anly-trend-chip.up { background: rgba(45,122,79,0.12); color: #2d7a4f; }
.anly-trend-chip.down { background: rgba(220,53,69,0.1); color: #dc3545; }
.anly-view-tabs { display: flex; gap: 0.35rem; background: var(--bg-alt); border-radius: 10px; padding: 0.3rem; margin-bottom: 1rem; }
.anly-view-tab { flex: 1; padding: 0.45rem 0.7rem; border: none; background: none; border-radius: 7px; font-size: 0.82rem; font-weight: 600; color: var(--text-muted); cursor: pointer; font-family: inherit; transition: all 0.12s; display: flex; align-items: center; justify-content: center; gap: 0.4rem; }
.anly-view-tab.active { background: var(--card-bg); color: var(--text); box-shadow: 0 1px 4px rgba(10,18,35,0.1); }
.anly-chart-canvas { display: block; width: 100%; cursor: crosshair; }
.anly-badge { display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.2rem 0.6rem; border-radius: 20px; font-size: 0.75rem; font-weight: 700; }
</style>

<div class="page-header-box">
	<div class="phb-left">
		<span class="phb-icon">${Icons.get("chart", 18)}</span>
		<div class="phb-text">
			<h1>Analytics</h1>
			<p class="page-description">Intelligence produit &amp; march\u00e9 \u2014 performances, tendances et comportements d'achat</p>
		</div>
	</div>
</div>

<!-- Period selector -->
<div class="filters-advanced">
	<div class="period-selector">
		${periods
			.map(
				({ key, label }) =>
					`<button class="period-btn${this.currentPeriod === key ? " active" : ""}" data-period="${key}">${label}</button>`,
			)
			.join("")}
	</div>
</div>

<!-- Global KPIs -->
${this.renderKPIs(filtered, allSales, products)}

<!-- View tabs -->
<div class="anly-section">
	<div class="anly-view-tabs">
		${views
			.map(
				(v) => `
			<button class="anly-view-tab${this.currentView === v.key ? " active" : ""}" onclick="AnalyticsModule.switchView('${v.key}')">
				${Icons.get(v.icon, 13)} ${v.label}
			</button>
		`,
			)
			.join("")}
	</div>

	${this.currentView === "products" ? this.renderProductsView(filtered, products, allSales) : ""}
	${this.currentView === "clients" ? this.renderClientsView(filtered, clients, products) : ""}
	${this.currentView === "platforms" ? this.renderPlatformsView(filtered, products) : ""}
</div>

<!-- Trend chart -->
<div class="anly-section">
	<div class="anly-section-title">${Icons.get("barChart", 16)} \u00c9volution sur la p\u00e9riode</div>
	<canvas id="anlyTrendChart" class="anly-chart-canvas" height="200" style="width:100%;"></canvas>
</div>

<div id="anlyTooltip" class="anly-tooltip"></div>
		`;

		requestAnimationFrame(() => {
			this.drawTrendChart(filtered, allSales);
		});
	},

	// ── KPIs ────────────────────────────────────────────────────────────────
	renderKPIs(filtered, allSales, products) {
		const completed = filtered.filter(
			(s) => (s.status || "completed") === "completed",
		);

		// Product frequency maps
		const soldMap = {};
		completed.forEach((s) => {
			const pid = String(s.productId);
			soldMap[pid] = (soldMap[pid] || 0) + (s.quantity || 1);
		});
		const sorted = Object.entries(soldMap).sort(([, a], [, b]) => b - a);
		const topProdId = sorted[0]?.[0];
		const bottomProdId = sorted[sorted.length - 1]?.[0];
		const topProd = products.find((p) => String(p.id) === topProdId);
		const bottomProd = products.find((p) => String(p.id) === bottomProdId);
		const topStock = products.reduce(
			(mx, p) => (p.stock > mx.stock ? p : mx),
			products[0] || {},
		);
		const lowStock = products
			.filter((p) => (p.stock || 0) > 0)
			.reduce(
				(mn, p) => (p.stock < mn.stock ? p : mn),
				products.find((p) => (p.stock || 0) > 0) || {},
			);

		const totalRevenue = completed.reduce(
			(sum, s) => sum + (s.totalTTC || 0),
			0,
		);
		const totalQty = completed.reduce(
			(sum, s) => sum + (s.quantity || 1),
			0,
		);
		const uniqueClients = new Set(
			completed.map((s) => s.clientId || s.clientName),
		).size;

		const cards = [
			{
				label: "Articles vendus",
				value: String(totalQty),
				sub: `${completed.length} ventes`,
				color: "#253868",
				bg: "rgba(37,56,104,0.08)",
			},
			{
				label: "CA p\u00e9riode",
				value: this.fmt(totalRevenue),
				sub: `moy. ${this.fmt(totalRevenue / (completed.length || 1))} / vente`,
				color: "#2d7a4f",
				bg: "rgba(45,122,79,0.08)",
			},
			{
				label: "Clients actifs",
				value: String(uniqueClients),
				sub: `sur la p\u00e9riode`,
				color: "#b8923a",
				bg: "rgba(184,146,58,0.08)",
			},
			{
				label: "Top produit",
				value: topProd?.name || "\u2014",
				sub: `${sorted[0]?.[1] || 0} unit\u00e9${(sorted[0]?.[1] || 0) > 1 ? "s" : ""} vendues`,
				color: "#7c3aed",
				bg: "rgba(124,58,237,0.08)",
			},
			{
				label: "Moins vendu",
				value: bottomProd?.name || "\u2014",
				sub: `${sorted[sorted.length - 1]?.[1] || 0} unit\u00e9`,
				color: "#dc3545",
				bg: "rgba(220,53,69,0.08)",
			},
			{
				label: "Plus en stock",
				value: topStock?.name || "\u2014",
				sub: `${topStock?.stock || 0} unit\u00e9s`,
				color: "#0891b2",
				bg: "rgba(8,145,178,0.08)",
			},
		];

		return (
			`<div class="anly-kpi-row">` +
			cards
				.map(
					(c) => `
			<div class="anly-kpi" onclick="AnalyticsModule.showKPIDetail('${c.label.replace(/'/g, "\\'")}')">
				<div style="width:24px;height:24px;border-radius:6px;background:${c.bg};color:${c.color};margin-bottom:0.2rem;"></div>
				<div class="anly-kpi-label">${c.label}</div>
				<div class="anly-kpi-value" style="font-size:${c.value.length > 12 ? "0.9rem" : "1.1rem"};">${c.value}</div>
				<div class="anly-kpi-sub">${c.sub}</div>
			</div>
		`,
				)
				.join("") +
			`</div>`
		);
	},

	// ── Products view ────────────────────────────────────────────────────────
	renderProductsView(filtered, products, allSales) {
		const completed = filtered.filter(
			(s) => (s.status || "completed") === "completed",
		);
		const allCompleted = allSales.filter(
			(s) => (s.status || "completed") === "completed",
		);

		// Build per-product stats
		const stats = {};
		products.forEach((p) => {
			stats[p.id] = {
				id: p.id,
				name: p.name,
				category: p.category || "\u2014",
				qty: 0,
				revenue: 0,
				allTimeQty: 0,
				stock: p.stock || 0,
			};
		});
		completed.forEach((s) => {
			if (!stats[s.productId])
				stats[s.productId] = {
					id: s.productId,
					name: `Produit #${s.productId}`,
					category: "\u2014",
					qty: 0,
					revenue: 0,
					allTimeQty: 0,
					stock: 0,
				};
			stats[s.productId].qty += s.quantity || 1;
			stats[s.productId].revenue += s.totalTTC || 0;
		});
		allCompleted.forEach((s) => {
			if (stats[s.productId])
				stats[s.productId].allTimeQty += s.quantity || 1;
		});

		const byQty = Object.values(stats)
			.filter((s) => s.qty > 0)
			.sort((a, b) => b.qty - a.qty);
		const byRev = Object.values(stats)
			.filter((s) => s.revenue > 0)
			.sort((a, b) => b.revenue - a.revenue);
		const unsold = Object.values(stats)
			.filter((s) => s.qty === 0 && s.stock > 0)
			.sort((a, b) => b.stock - a.stock);
		const maxQty = byQty[0]?.qty || 1;
		const maxRev = byRev[0]?.revenue || 1;

		const barColors = [
			"#253868",
			"#b8923a",
			"#2d7a4f",
			"#7c3aed",
			"#0891b2",
			"#dc3545",
		];

		const rankList = (items, maxVal, valueKey, valueFmt, color) =>
			items
				.slice(0, 8)
				.map((item, i) => {
					const val = item[valueKey];
					const pct = ((val / maxVal) * 100).toFixed(0);
					return `
					<div class="anly-bar-row" onclick="AnalyticsModule.showProductDetail(${item.id})">
						<div class="anly-bar-rank">${i + 1}</div>
						<div class="anly-bar-label" title="${item.name}">${item.name}</div>
						<div class="anly-bar-track">
							<div class="anly-bar-fill" style="width:${pct}%;background:${barColors[i % barColors.length]};"></div>
						</div>
						<div class="anly-bar-value">${valueFmt(val)}</div>
						<div class="anly-bar-count">${item.qty} vte${item.qty > 1 ? "s" : ""}</div>
					</div>
				`;
				})
				.join("");

		return `
			<div class="anly-two-col" style="margin-top:0;">
				<div>
					<div class="anly-section-title" style="margin-bottom:0.6rem;">${Icons.get("trendingUp", 14)} Plus vendus (quantit\u00e9)</div>
					${
						byQty.length
							? rankList(
									byQty,
									maxQty,
									"qty",
									(v) => `${v} u.`,
									"#253868",
								)
							: `<p style="color:var(--text-muted);font-size:0.875rem;">Aucune vente sur cette p\u00e9riode.</p>`
					}
				</div>
				<div>
					<div class="anly-section-title" style="margin-bottom:0.6rem;">${Icons.get("dollarSign", 14)} Meilleurs CA</div>
					${
						byRev.length
							? byRev
									.slice(0, 8)
									.map((item, i) => {
										const pct = (
											(item.revenue / maxRev) *
											100
										).toFixed(0);
										return `
							<div class="anly-bar-row" onclick="AnalyticsModule.showProductDetail(${item.id})">
								<div class="anly-bar-rank">${i + 1}</div>
								<div class="anly-bar-label" title="${item.name}">${item.name}</div>
								<div class="anly-bar-track">
									<div class="anly-bar-fill" style="width:${pct}%;background:${barColors[i % barColors.length]};"></div>
								</div>
								<div class="anly-bar-value">${this.fmt(item.revenue)}</div>
								<div class="anly-bar-count">${item.qty} u.</div>
							</div>
						`;
									})
									.join("")
							: `<p style="color:var(--text-muted);font-size:0.875rem;">Aucune vente sur cette p\u00e9riode.</p>`
					}
				</div>
			</div>

			${
				unsold.length > 0
					? `
				<div style="margin-top:1rem;">
					<div class="anly-section-title" style="margin-bottom:0.6rem;">
						${Icons.get("package", 14)} Non vendus sur la p\u00e9riode
						<span class="badge badge-warning" style="font-size:0.72rem;">${unsold.length} produit${unsold.length > 1 ? "s" : ""}</span>
					</div>
					<div style="display:flex;flex-wrap:wrap;gap:0.5rem;">
						${unsold
							.slice(0, 12)
							.map(
								(p) => `
							<div onclick="AnalyticsModule.showProductDetail(${p.id})"
								style="padding:0.35rem 0.75rem;background:var(--bg-alt);border:1.5px solid var(--border-color);border-radius:20px;font-size:0.8rem;cursor:pointer;transition:border-color 0.12s;"
								onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border-color)'">
								${p.name} <span style="color:var(--text-muted);">(${p.stock})</span>
							</div>
						`,
							)
							.join("")}
					</div>
				</div>
			`
					: ""
			}
		`;
	},

	// ── Clients view ─────────────────────────────────────────────────────────
	renderClientsView(filtered, clients, products) {
		const completed = filtered.filter(
			(s) => (s.status || "completed") === "completed",
		);

		const stats = {};
		completed.forEach((s) => {
			const cid = s.clientId || s.clientName || "unknown";
			if (!stats[cid])
				stats[cid] = {
					cid,
					name: "",
					ca: 0,
					qty: 0,
					orders: 0,
					products: new Set(),
					lastOrder: null,
				};
			const client = clients.find((c) => String(c.id) === String(cid));
			stats[cid].name = client?.name || s.clientName || `Client #${cid}`;
			stats[cid].ca += s.totalTTC || 0;
			stats[cid].qty += s.quantity || 1;
			stats[cid].orders += 1;
			if (s.productId) stats[cid].products.add(s.productId);
			const d = new Date(s.createdAt || s.date);
			if (!stats[cid].lastOrder || d > stats[cid].lastOrder)
				stats[cid].lastOrder = d;
		});

		const sorted = Object.values(stats).sort((a, b) => b.ca - a.ca);
		const maxCA = sorted[0]?.ca || 1;
		const barColors = [
			"#253868",
			"#b8923a",
			"#2d7a4f",
			"#7c3aed",
			"#0891b2",
			"#dc3545",
		];

		if (sorted.length === 0)
			return `<p style="color:var(--text-muted);">Aucun client sur cette p\u00e9riode.</p>`;

		return `
			<div>
				<div class="anly-section-title" style="margin-bottom:0.6rem;">${Icons.get("users", 14)} Clients par CA g\u00e9n\u00e9r\u00e9</div>
				${sorted
					.map((c, i) => {
						const pct = ((c.ca / maxCA) * 100).toFixed(0);
						const daysAgo = c.lastOrder
							? Math.floor((new Date() - c.lastOrder) / 86400000)
							: null;
						return `
						<div class="anly-bar-row" onclick="AnalyticsModule.showClientDetail('${c.cid}')">
							<div class="anly-bar-rank">${i + 1}</div>
							<div class="anly-bar-label">${c.name}</div>
							<div style="font-size:0.72rem;color:var(--text-muted);min-width:60px;">
								${daysAgo !== null ? (daysAgo === 0 ? "Aujourd'hui" : `Il y a ${daysAgo}j`) : "\u2014"}
							</div>
							<div class="anly-bar-track">
								<div class="anly-bar-fill" style="width:${pct}%;background:${barColors[i % barColors.length]};"></div>
							</div>
							<div class="anly-bar-value">${this.fmt(c.ca)}</div>
							<div class="anly-bar-count">${c.orders} cmd.</div>
						</div>
					`;
					})
					.join("")}
			</div>
		`;
	},

	// ── Platforms view ───────────────────────────────────────────────────────
	renderPlatformsView(filtered, products) {
		const completed = filtered.filter(
			(s) => (s.status || "completed") === "completed",
		);

		const platforms = {};
		completed.forEach((s) => {
			const platform = s.platform || "Direct";
			if (!platforms[platform])
				platforms[platform] = {
					name: platform,
					ca: 0,
					qty: 0,
					orders: 0,
					clients: new Set(),
					products: new Set(),
				};
			platforms[platform].ca += s.totalTTC || 0;
			platforms[platform].qty += s.quantity || 1;
			platforms[platform].orders += 1;
			if (s.clientId || s.clientName)
				platforms[platform].clients.add(s.clientId || s.clientName);
			if (s.productId) platforms[platform].products.add(s.productId);
		});

		const sorted = Object.values(platforms).sort((a, b) => b.ca - a.ca);
		const totalCA = sorted.reduce((sum, p) => sum + p.ca, 0);

		const platColors = {
			Vinted: "#09b1ba",
			Etsy: "#f56400",
			Amazon: "#ff9900",
			eBay: "#e53238",
			Direct: "#253868",
			Instagram: "#e1306c",
			Leboncoin: "#ff6e14",
		};

		if (sorted.length === 0)
			return `<p style="color:var(--text-muted);">Aucune vente sur cette p\u00e9riode.</p>`;

		return `
			<div class="anly-platform-grid">
				${sorted
					.map((p) => {
						const color = platColors[p.name] || "#253868";
						const share =
							totalCA > 0
								? ((p.ca / totalCA) * 100).toFixed(1)
								: 0;
						return `
						<div class="anly-platform-card" onclick="AnalyticsModule.showPlatformDetail('${p.name}')">
							<div style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem;">
								<span style="font-size:0.9rem;font-weight:700;color:${color};">${p.name}</span>
								<span style="font-size:1rem;font-weight:800;color:var(--text);">${this.fmt(p.ca)}</span>
							</div>
							<div style="height:4px;background:var(--border-color);border-radius:2px;overflow:hidden;margin:0.1rem 0;">
								<div style="width:${share}%;height:100%;background:${color};border-radius:2px;"></div>
							</div>
							<div style="display:flex;gap:0.75rem;font-size:0.75rem;color:var(--text-muted);">
								<span><strong style="color:var(--text);">${p.qty}</strong> articles</span>
								<span><strong style="color:var(--text);">${p.orders}</strong> ventes</span>
								<span><strong style="color:var(--text);">${p.clients.size}</strong> clients</span>
								<span><strong style="color:var(--accent);">${share}%</strong> du CA</span>
							</div>
						</div>
					`;
					})
					.join("")}
			</div>
		`;
	},

	// ── Trend chart (canvas) ─────────────────────────────────────────────────
	drawTrendChart(filtered, allSales) {
		const canvas = document.getElementById("anlyTrendChart");
		if (!canvas) return;

		const ctx = canvas.getContext("2d");
		const dpr = window.devicePixelRatio || 1;
		const width = canvas.offsetWidth || 600;
		const h = 200;

		canvas.width = width * dpr;
		canvas.height = h * dpr;
		canvas.style.height = h + "px";
		ctx.scale(dpr, dpr);

		const completed = (s) => (s.status || "completed") === "completed";
		const buckets = this.buildTrendBuckets(
			this.currentPeriod,
			filtered,
			allSales,
		);

		if (!buckets.length) return;

		const padL = 44,
			padR = 12,
			padT = 10,
			padB = 34;
		const cw = width - padL - padR;
		const ch = h - padT - padB;
		const maxQty = Math.max(...buckets.map((b) => b.qty), 1);
		const maxRevK = Math.max(...buckets.map((b) => b.revenue), 1);

		// Grid lines
		ctx.strokeStyle = "rgba(0,0,0,0.055)";
		ctx.lineWidth = 1;
		for (let i = 0; i <= 4; i++) {
			const y = padT + ch - (i / 4) * ch;
			ctx.beginPath();
			ctx.moveTo(padL, y);
			ctx.lineTo(padL + cw, y);
			ctx.stroke();
			const val = (maxRevK / 4) * i;
			ctx.fillStyle = "#8a9ab5";
			ctx.font = "9px sans-serif";
			ctx.textAlign = "right";
			ctx.fillText(
				val >= 1000 ? (val / 1000).toFixed(1) + "k" : val.toFixed(0),
				padL - 4,
				y + 3,
			);
		}

		// Revenue area (filled)
		const pts = buckets.map((b, i) => ({
			x: padL + (i / (buckets.length - 1 || 1)) * cw,
			y: padT + ch - (b.revenue / maxRevK) * ch,
			...b,
		}));

		if (pts.length > 1) {
			// Gradient fill
			const grad = ctx.createLinearGradient(0, padT, 0, padT + ch);
			grad.addColorStop(0, "rgba(37,56,104,0.25)");
			grad.addColorStop(1, "rgba(37,56,104,0.0)");
			ctx.fillStyle = grad;
			ctx.beginPath();
			ctx.moveTo(pts[0].x, padT + ch);
			pts.forEach((p) => ctx.lineTo(p.x, p.y));
			ctx.lineTo(pts[pts.length - 1].x, padT + ch);
			ctx.closePath();
			ctx.fill();

			// Line
			ctx.strokeStyle = "#253868";
			ctx.lineWidth = 2;
			ctx.lineJoin = "round";
			ctx.beginPath();
			pts.forEach((p, i) =>
				i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y),
			);
			ctx.stroke();

			// Qty bars (accent)
			const barW = Math.min((cw / buckets.length) * 0.5, 14);
			buckets.forEach((b, i) => {
				const x =
					padL + (i / (buckets.length - 1 || 1)) * cw - barW / 2;
				const bh = (b.qty / maxQty) * ch * 0.35;
				ctx.fillStyle = "rgba(184,146,58,0.6)";
				ctx.beginPath();
				ctx.roundRect
					? ctx.roundRect(x, padT + ch - bh, barW, bh, [2, 2, 0, 0])
					: ctx.rect(x, padT + ch - bh, barW, bh);
				ctx.fill();
			});

			// Dots
			pts.forEach((p) => {
				ctx.beginPath();
				ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
				ctx.fillStyle = "#253868";
				ctx.fill();
				ctx.strokeStyle = "#fff";
				ctx.lineWidth = 1.5;
				ctx.stroke();
			});
		}

		// X labels
		const step = Math.ceil(buckets.length / 10);
		buckets.forEach((b, i) => {
			if (i % step !== 0 && i !== buckets.length - 1) return;
			const x = padL + (i / (buckets.length - 1 || 1)) * cw;
			ctx.fillStyle = "#8a9ab5";
			ctx.font = "9px sans-serif";
			ctx.textAlign = "center";
			ctx.fillText(b.label, x, h - padB + 14);
		});

		// Legend
		ctx.fillStyle = "#253868";
		ctx.fillRect(padL, padT - 6, 10, 8);
		ctx.fillStyle = "#8a9ab5";
		ctx.font = "9px sans-serif";
		ctx.textAlign = "left";
		ctx.fillText("CA (€)", padL + 13, padT + 2);
		ctx.fillStyle = "rgba(184,146,58,0.6)";
		ctx.fillRect(padL + 65, padT - 6, 10, 8);
		ctx.fillStyle = "#8a9ab5";
		ctx.fillText("Qté vendue", padL + 78, padT + 2);

		// Hover tooltip
		this._trendPts = pts;
		const tooltip = document.getElementById("anlyTooltip");

		canvas.onmousemove = (e) => {
			if (!this._trendPts?.length) return;
			const rect = canvas.getBoundingClientRect();
			const mx = e.clientX - rect.left;
			// Find closest point
			const hit = this._trendPts.reduce((best, p) =>
				Math.abs(p.x - mx) < Math.abs(best.x - mx) ? p : best,
			);
			if (Math.abs(hit.x - mx) > cw / buckets.length + 8) {
				tooltip.style.display = "none";
				return;
			}
			tooltip.style.display = "block";
			tooltip.style.left = e.clientX + 14 + "px";
			tooltip.style.top = e.clientY - 12 + "px";
			tooltip.innerHTML = `
				<div class="anly-tooltip-title">${hit.label}</div>
				<div class="anly-tooltip-row"><span>CA</span><strong>${this.fmt(hit.revenue)}</strong></div>
				<div class="anly-tooltip-row"><span>Unit\u00e9s vendues</span><strong>${hit.qty}</strong></div>
				<div class="anly-tooltip-row"><span>Commandes</span><strong>${hit.orders}</strong></div>
			`;
			canvas.style.cursor = "pointer";
		};
		canvas.onmouseleave = () => {
			if (tooltip) tooltip.style.display = "none";
		};
		canvas.onclick = (e) => {
			if (!this._trendPts?.length) return;
			const rect = canvas.getBoundingClientRect();
			const mx = e.clientX - rect.left;
			const hit = this._trendPts.reduce((best, p) =>
				Math.abs(p.x - mx) < Math.abs(best.x - mx) ? p : best,
			);
			if (Math.abs(hit.x - mx) < cw / buckets.length + 8)
				this.showTrendDetail(hit);
		};
	},

	buildTrendBuckets(period, filtered, allSales) {
		const now = new Date();
		const comp = (s) => (s.status || "completed") === "completed";
		const agg = (arr) => ({
			revenue: arr
				.filter(comp)
				.reduce((sum, s) => sum + (s.totalTTC || 0), 0),
			qty: arr
				.filter(comp)
				.reduce((sum, s) => sum + (s.quantity || 1), 0),
			orders: arr.filter(comp).length,
		});

		if (period === "today") {
			return Array.from({ length: 24 }, (_, h) => {
				const match = (s) => {
					const d = new Date(s.createdAt || s.date);
					return (
						d.toDateString() === now.toDateString() &&
						d.getHours() === h
					);
				};
				return {
					label: `${String(h).padStart(2, "0")}h`,
					...agg(filtered.filter(match)),
				};
			});
		}
		if (period === "week") {
			return Array.from({ length: 7 }, (_, i) => {
				const d = new Date(now);
				d.setDate(now.getDate() - (6 - i));
				const dStr = d.toDateString();
				const label = d.toLocaleDateString("fr-FR", {
					weekday: "short",
					day: "numeric",
				});
				return {
					label,
					...agg(
						filtered.filter(
							(s) =>
								new Date(
									s.createdAt || s.date,
								).toDateString() === dStr,
						),
					),
				};
			});
		}
		if (period === "month") {
			const days = new Date(
				now.getFullYear(),
				now.getMonth() + 1,
				0,
			).getDate();
			return Array.from({ length: days }, (_, d) => {
				const day = d + 1;
				const match = (s) => {
					const sd = new Date(s.createdAt || s.date);
					return (
						sd.getFullYear() === now.getFullYear() &&
						sd.getMonth() === now.getMonth() &&
						sd.getDate() === day
					);
				};
				return { label: String(day), ...agg(filtered.filter(match)) };
			});
		}
		if (period === "quarter" || period === "sixmonths") {
			const weeks = period === "quarter" ? 13 : 26;
			return Array.from({ length: weeks }, (_, w) => {
				const wEnd = new Date(now);
				wEnd.setDate(wEnd.getDate() - (weeks - 1 - w) * 7);
				const wStart = new Date(wEnd);
				wStart.setDate(wStart.getDate() - 6);
				const label = wStart.toLocaleDateString("fr-FR", {
					day: "2-digit",
					month: "2-digit",
				});
				const match = (s) => {
					const d = new Date(s.createdAt || s.date);
					return d >= wStart && d <= wEnd;
				};
				return { label, ...agg(filtered.filter(match)) };
			});
		}
		// year
		return Array.from({ length: 12 }, (_, m) => {
			const mo = new Date(now.getFullYear(), now.getMonth() - 11 + m, 1);
			const label = mo.toLocaleDateString("fr-FR", { month: "short" });
			const match = (s) => {
				const d = new Date(s.createdAt || s.date);
				return (
					d.getFullYear() === mo.getFullYear() &&
					d.getMonth() === mo.getMonth()
				);
			};
			return { label, ...agg(filtered.filter(match)) };
		});
	},

	// ── Detail panels ────────────────────────────────────────────────────────
	closeDetail() {
		const el = document.getElementById("anlyDetailPanel");
		if (el) el.remove();
	},

	_showPanel(title, body) {
		this.closeDetail();
		const panel = document.createElement("div");
		panel.id = "anlyDetailPanel";
		panel.className = "anly-detail-panel";
		panel.innerHTML = `
			<div class="anly-detail-content">
				<div class="anly-detail-header">
					<div style="font-size:1rem;font-weight:700;color:var(--text);">${title}</div>
					<button onclick="AnalyticsModule.closeDetail()" style="background:none;border:none;cursor:pointer;font-size:1.3rem;color:var(--text-muted);padding:0.25rem;">&times;</button>
				</div>
				<div class="anly-detail-body">${body}</div>
			</div>
		`;
		panel.addEventListener("click", (e) => {
			if (e.target === panel) this.closeDetail();
		});
		document.body.appendChild(panel);
	},

	showProductDetail(id) {
		const allSales = DataManager.get("sales") || [];
		const products = DataManager.get("products") || [];
		const clients = DataManager.get("clients") || [];
		const product = products.find((p) => String(p.id) === String(id));
		if (!product) return;

		const productSales = allSales.filter(
			(s) =>
				String(s.productId) === String(id) &&
				(s.status || "completed") === "completed",
		);
		const totalQty = productSales.reduce(
			(sum, s) => sum + (s.quantity || 1),
			0,
		);
		const totalRev = productSales.reduce(
			(sum, s) => sum + (s.totalTTC || 0),
			0,
		);

		// Top clients for this product
		const clientMap = {};
		productSales.forEach((s) => {
			const cid = s.clientId || s.clientName || "?";
			clientMap[cid] = (clientMap[cid] || 0) + (s.quantity || 1);
		});
		const topClients = Object.entries(clientMap)
			.sort(([, a], [, b]) => b - a)
			.slice(0, 5)
			.map(([cid, qty]) => {
				const client = clients.find(
					(c) => String(c.id) === String(cid),
				);
				return `<li>${client?.name || `Client #${cid}`}: <strong>${qty}</strong> unit\u00e9${qty > 1 ? "s" : ""}</li>`;
			})
			.join("");

		// Monthly breakdown
		const now = new Date();
		const months = Array.from({ length: 6 }, (_, i) => {
			const mo = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
			const label = mo.toLocaleDateString("fr-FR", {
				month: "short",
				year: "2-digit",
			});
			const moSales = productSales.filter((s) => {
				const d = new Date(s.createdAt || s.date);
				return (
					d.getFullYear() === mo.getFullYear() &&
					d.getMonth() === mo.getMonth()
				);
			});
			return {
				label,
				qty: moSales.reduce((sum, s) => sum + (s.quantity || 1), 0),
				rev: moSales.reduce((sum, s) => sum + (s.totalTTC || 0), 0),
			};
		});

		this._showPanel(
			`${product.name} \u2014 Analyse`,
			`
			<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.75rem;margin-bottom:1.25rem;">
				<div style="background:var(--bg-alt);border-radius:10px;padding:0.8rem;text-align:center;">
					<div style="font-size:0.68rem;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin-bottom:0.3rem;">Total vendus</div>
					<div style="font-size:1.3rem;font-weight:800;">${totalQty}</div>
				</div>
				<div style="background:var(--bg-alt);border-radius:10px;padding:0.8rem;text-align:center;">
					<div style="font-size:0.68rem;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin-bottom:0.3rem;">CA total</div>
					<div style="font-size:1.1rem;font-weight:800;">${this.fmt(totalRev)}</div>
				</div>
				<div style="background:var(--bg-alt);border-radius:10px;padding:0.8rem;text-align:center;">
					<div style="font-size:0.68rem;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin-bottom:0.3rem;">Stock actuel</div>
					<div style="font-size:1.3rem;font-weight:800;">${product.stock || 0}</div>
				</div>
			</div>

			<div style="display:grid;grid-template-columns:1fr 1fr;gap:1.25rem;">
				<div>
					<div style="font-size:0.78rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.5rem;">Top acheteurs</div>
					${topClients ? `<ul style="margin:0;padding-left:1.2rem;font-size:0.875rem;line-height:1.8;">${topClients}</ul>` : `<p style="color:var(--text-muted);">Aucun acheteur.</p>`}
				</div>
				<div>
					<div style="font-size:0.78rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.5rem;">Ventilation 6 mois</div>
					${months
						.map(
							(m) => `
						<div style="display:flex;justify-content:space-between;align-items:center;font-size:0.8rem;margin:0.25rem 0;">
							<span style="color:var(--text-muted);width:48px;">${m.label}</span>
							<div style="flex:1;height:6px;background:var(--bg-alt);border-radius:3px;overflow:hidden;margin:0 0.5rem;">
								<div style="width:${((m.qty / (Math.max(...months.map((x) => x.qty)) || 1)) * 100).toFixed(0)}%;height:100%;background:#253868;border-radius:3px;"></div>
							</div>
							<span style="font-weight:600;">${m.qty}</span>
						</div>
					`,
						)
						.join("")}
				</div>
			</div>
		`,
		);
	},

	showClientDetail(cid) {
		const allSales = DataManager.get("sales") || [];
		const clients = DataManager.get("clients") || [];
		const products = DataManager.get("products") || [];
		const client = clients.find((c) => String(c.id) === String(cid));
		const name = client?.name || `Client #${cid}`;
		const sales = allSales.filter(
			(s) =>
				String(s.clientId || s.clientName) === String(cid) &&
				(s.status || "completed") === "completed",
		);
		const ca = sales.reduce((sum, s) => sum + (s.totalTTC || 0), 0);
		const qty = sales.reduce((sum, s) => sum + (s.quantity || 1), 0);

		// Products bought
		const prodMap = {};
		sales.forEach((s) => {
			prodMap[s.productId] =
				(prodMap[s.productId] || 0) + (s.quantity || 1);
		});
		const topProds = Object.entries(prodMap)
			.sort(([, a], [, b]) => b - a)
			.slice(0, 6)
			.map(([pid, q]) => {
				const prod = products.find((p) => String(p.id) === String(pid));
				return `<div style="display:flex;justify-content:space-between;align-items:center;padding:0.3rem 0;border-bottom:1px solid var(--border-light);font-size:0.85rem;">
				<span>${prod?.name || `Produit #${pid}`}</span>
				<strong>${q} u. &mdash; ${this.fmt(sales.filter((s) => String(s.productId) === String(pid)).reduce((s, x) => s + (x.totalTTC || 0), 0))}</strong>
			</div>`;
			})
			.join("");

		this._showPanel(
			`${name} \u2014 ${this.fmt(ca)}`,
			`
			<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.75rem;margin-bottom:1.25rem;">
				<div style="background:var(--bg-alt);border-radius:10px;padding:0.8rem;text-align:center;">
					<div style="font-size:0.68rem;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin-bottom:0.3rem;">CA total</div>
					<div style="font-size:1.1rem;font-weight:800;">${this.fmt(ca)}</div>
				</div>
				<div style="background:var(--bg-alt);border-radius:10px;padding:0.8rem;text-align:center;">
					<div style="font-size:0.68rem;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin-bottom:0.3rem;">Articles ach.</div>
					<div style="font-size:1.3rem;font-weight:800;">${qty}</div>
				</div>
				<div style="background:var(--bg-alt);border-radius:10px;padding:0.8rem;text-align:center;">
					<div style="font-size:0.68rem;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin-bottom:0.3rem;">Commandes</div>
					<div style="font-size:1.3rem;font-weight:800;">${sales.length}</div>
				</div>
			</div>
			<div style="font-size:0.78rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:0.5rem;">Articles achet\u00e9s</div>
			${topProds || `<p style="color:var(--text-muted);">Aucun achat enregistr\u00e9.</p>`}
		`,
		);
	},

	showPlatformDetail(name) {
		const allSales = DataManager.get("sales") || [];
		const products = DataManager.get("products") || [];
		const clients = DataManager.get("clients") || [];
		const filtered = this.getFilteredSales(this.currentPeriod, allSales);
		const platSales = filtered.filter(
			(s) =>
				(s.platform || "Direct") === name &&
				(s.status || "completed") === "completed",
		);
		const ca = platSales.reduce((sum, s) => sum + (s.totalTTC || 0), 0);
		const qty = platSales.reduce((sum, s) => sum + (s.quantity || 1), 0);

		const prodMap = {};
		platSales.forEach((s) => {
			prodMap[s.productId] =
				(prodMap[s.productId] || 0) + (s.quantity || 1);
		});
		const topProds = Object.entries(prodMap)
			.sort(([, a], [, b]) => b - a)
			.slice(0, 5)
			.map(([pid, q]) => {
				const prod = products.find((p) => String(p.id) === String(pid));
				return `<li>${prod?.name || `Produit #${pid}`}: <strong>${q}</strong> unit\u00e9${q > 1 ? "s" : ""}</li>`;
			})
			.join("");

		this._showPanel(
			`${name} \u2014 Analyse plateforme`,
			`
			<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.75rem;margin-bottom:1.25rem;">
				<div style="background:var(--bg-alt);border-radius:10px;padding:0.8rem;text-align:center;">
					<div style="font-size:0.68rem;font-weight:700;text-transform:uppercase;color:var(--text-muted);">CA</div>
					<div style="font-size:1.1rem;font-weight:800;">${this.fmt(ca)}</div>
				</div>
				<div style="background:var(--bg-alt);border-radius:10px;padding:0.8rem;text-align:center;">
					<div style="font-size:0.68rem;font-weight:700;text-transform:uppercase;color:var(--text-muted);">Articles</div>
					<div style="font-size:1.3rem;font-weight:800;">${qty}</div>
				</div>
				<div style="background:var(--bg-alt);border-radius:10px;padding:0.8rem;text-align:center;">
					<div style="font-size:0.68rem;font-weight:700;text-transform:uppercase;color:var(--text-muted);">Ventes</div>
					<div style="font-size:1.3rem;font-weight:800;">${platSales.length}</div>
				</div>
			</div>
			<div style="font-size:0.78rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:0.5rem;">Produits les plus vendus</div>
			${topProds ? `<ul style="margin:0;padding-left:1.2rem;font-size:0.875rem;line-height:2;">${topProds}</ul>` : `<p style="color:var(--text-muted);">Aucun produit.</p>`}
		`,
		);
	},

	showTrendDetail(hit) {
		this._showPanel(
			`Analyse \u2014 ${hit.label}`,
			`
			<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.75rem;">
				<div style="background:rgba(37,56,104,0.08);border-radius:10px;padding:0.8rem;text-align:center;">
					<div style="font-size:0.68rem;font-weight:700;text-transform:uppercase;color:#253868;margin-bottom:0.3rem;">CA</div>
					<div style="font-size:1.2rem;font-weight:800;color:#253868;">${this.fmt(hit.revenue)}</div>
				</div>
				<div style="background:rgba(184,146,58,0.08);border-radius:10px;padding:0.8rem;text-align:center;">
					<div style="font-size:0.68rem;font-weight:700;text-transform:uppercase;color:#b8923a;margin-bottom:0.3rem;">Unit\u00e9s</div>
					<div style="font-size:1.3rem;font-weight:800;color:#b8923a;">${hit.qty}</div>
				</div>
				<div style="background:var(--bg-alt);border-radius:10px;padding:0.8rem;text-align:center;">
					<div style="font-size:0.68rem;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin-bottom:0.3rem;">Commandes</div>
					<div style="font-size:1.3rem;font-weight:800;">${hit.orders}</div>
				</div>
			</div>
		`,
		);
	},

	showKPIDetail(label) {
		this._showPanel(
			label,
			`<p style="color:var(--text-muted);font-size:0.875rem;">D\u00e9tail de <strong>${label}</strong> sur la p\u00e9riode s\u00e9lectionn\u00e9e.</p>`,
		);
	},

	// ── Helpers ──────────────────────────────────────────────────────────────
	getFilteredSales(period, sales) {
		const now = new Date();
		if (period === "today") {
			const t = now.toDateString();
			return sales.filter(
				(s) => new Date(s.createdAt || s.date).toDateString() === t,
			);
		}
		const offsets = {
			week: 7,
			month: 30,
			quarter: 90,
			sixmonths: 180,
			year: 365,
		};
		const days = offsets[period] || 30;
		if (period === "month") {
			const from = new Date(now.getFullYear(), now.getMonth(), 1);
			return sales.filter((s) => new Date(s.createdAt || s.date) >= from);
		}
		if (period === "quarter") {
			const from = new Date(
				now.getFullYear(),
				Math.floor(now.getMonth() / 3) * 3,
				1,
			);
			return sales.filter((s) => new Date(s.createdAt || s.date) >= from);
		}
		if (period === "year") {
			const from = new Date(now.getFullYear(), 0, 1);
			return sales.filter((s) => new Date(s.createdAt || s.date) >= from);
		}
		const from = new Date(now);
		from.setDate(from.getDate() - days);
		from.setHours(0, 0, 0, 0);
		return sales.filter((s) => new Date(s.createdAt || s.date) >= from);
	},

	switchView(view) {
		this.currentView = view;
		this.render();
		this.bindEvents();
	},

	bindEvents() {
		const page = document.getElementById("analyticsPage");
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

window.AnalyticsModule = AnalyticsModule;
