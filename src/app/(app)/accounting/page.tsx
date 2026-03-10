"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import type { Sale } from "@/types";

// Tab identifiers
type Tab = "overview" | "revenus" | "tva" | "previsions" | "export";

const TAB_LABELS: Record<Tab, string> = {
	overview: "Vue d\u2019ensemble",
	revenus: "Revenus",
	tva: "TVA",
	previsions: "Pr\u00e9visions",
	export: "Export",
};

const TAB_ICONS: Record<Tab, React.ReactElement> = {
	overview: (
		<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
			<rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
			<rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
		</svg>
	),
	revenus: (
		<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
			<line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
		</svg>
	),
	tva: (
		<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
			<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
			<polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
		</svg>
	),
	previsions: (
		<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
			<polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
		</svg>
	),
	export: (
		<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
			<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
			<polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
		</svg>
	),
};

const MONTH_NAMES = [
	"Janvier", "F\u00e9vrier", "Mars", "Avril", "Mai", "Juin",
	"Juillet", "Ao\u00fbt", "Septembre", "Octobre", "Novembre", "D\u00e9cembre",
];

const MONTH_SHORT = [
	"Jan", "F\u00e9v", "Mar", "Avr", "Mai", "Juin",
	"Juil", "Ao\u00fb", "Sep", "Oct", "Nov", "D\u00e9c",
];

const QUARTER_LABELS = ["T1 (Jan-Mar)", "T2 (Avr-Juin)", "T3 (Juil-Sep)", "T4 (Oct-D\u00e9c)"];

const TVA_RATE = 0.2;

// Helpers

/**
 * Format a number as a French euro currency string
 * @param n - Amount in euros
 * @returns Formatted currency string
 */

function formatCurrency(n: number): string {
	return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

/**
 * Format a date value to a localised French date string
 * @param d - ISO date string or Date object
 * @returns Formatted date dd/mm/yyyy
 */

function formatDate(d: string | Date): string {
	return new Date(d).toLocaleDateString("fr-FR", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	});
}

/**
 * Compute a percentage share as a localised string
 * @param value - Partial value
 * @param total - Total value
 * @returns Percentage string with one decimal
 */

function pct(value: number, total: number): string {
	if (total === 0) return "0,0";
	return ((value / total) * 100).toFixed(1).replace(".", ",");
}

// Interfaces

interface MonthRow {
	month: number;
	year: number;
	label: string;
	count: number;
	grossTTC: number;
	grossHT: number;
	tva: number;
	avgSale: number;
	sales: Sale[];
}

interface TooltipState {
	x: number;
	y: number;
	data: MonthRow;
}

interface PlatformRow {
	platform: string;
	count: number;
	revenueTTC: number;
	revenueHT: number;
	share: number;
}

interface CategoryRow {
	category: string;
	count: number;
	revenueTTC: number;
	revenueHT: number;
	share: number;
}

interface SellerRow {
	name: string;
	count: number;
	revenueTTC: number;
	revenueHT: number;
	share: number;
}

interface QuarterRow {
	label: string;
	quarterIndex: number;
	tvaCollected: number;
	baseHT: number;
	monthBreakdown: { label: string; tva: number; ht: number }[];
}

/**
 * Pill-shaped tab navigation button
 * @param active - Whether this tab is currently selected
 * @param onClick - Click handler
 * @param children - Button content
 * @returns Styled pill button element
 */

function PillButton({
	active,
	onClick,
	children,
}: {
	active: boolean;
	onClick: () => void;
	children: React.ReactNode;
}) {
	return (
		<button
			onClick={onClick}
			style={{
				padding: "0.45rem 0.95rem",
				borderRadius: "8px",
				border: "none",
				background: active ? "var(--card-bg)" : "transparent",
				color: active ? "var(--accent)" : "var(--text-muted)",
				fontWeight: active ? 700 : 400,
				fontSize: "0.82rem",
				cursor: "pointer",
				boxShadow: active ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
				transition: "all 0.15s",
				display: "flex",
				alignItems: "center",
				gap: "0.4rem",
				fontFamily: "inherit",
			}}>
			{children}
		</button>
	);
}

/**
 * Titled card wrapper for a content section
 * @param title - Card header title
 * @param children - Card body content
 * @param actions - Optional elements rendered in the header right side
 * @param noPadding - When true the body has no padding
 * @returns Styled section card element
 */

function SectionCard({
	title,
	children,
	actions,
	noPadding,
}: {
	title: string;
	children: React.ReactNode;
	actions?: React.ReactNode;
	noPadding?: boolean;
}) {
	return (
		<div className="card" style={{ padding: 0, overflow: "hidden" }}>
			<div
				style={{
					padding: "0.85rem 1.15rem",
					borderBottom: "1px solid var(--border-color)",
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
				}}>
				<h3 style={{ margin: 0, fontSize: "0.92rem", fontWeight: 700 }}>{title}</h3>
				{actions}
			</div>
			<div style={noPadding ? {} : { padding: "0.85rem 1.15rem" }}>{children}</div>
		</div>
	);
}

/**
 * Single financial health indicator row with coloured status dot
 * @param label - Row label text
 * @param value - Displayed metric value
 * @param status - Colour category for the indicator dot
 * @returns Styled health indicator row element
 */

function HealthIndicator({
	label,
	value,
	status,
}: {
	label: string;
	value: string;
	status: "success" | "warning" | "danger" | "neutral";
}) {
	const colors: Record<string, string> = {
		success: "var(--success)",
		warning: "var(--warning)",
		danger: "var(--danger)",
		neutral: "var(--text-muted)",
	};
	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				padding: "0.6rem 0",
				borderBottom: "1px solid var(--border-color)",
			}}>
			<span style={{ fontSize: "0.82rem", color: "var(--text)" }}>{label}</span>
			<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
				<span style={{ fontWeight: 700, fontSize: "0.85rem", color: colors[status] }}>{value}</span>
				<div
					style={{
						width: "8px",
						height: "8px",
						borderRadius: "50%",
						background: colors[status],
					}}
				/>
			</div>
		</div>
	);
}

// Main page component

export default function AccountingPage() {
	const { user } = useAuth();
	const { showToast } = useToast();
	const router = useRouter();

	// State
	const [allSales, setAllSales] = useState<Sale[]>([]);
	const [loading, setLoading] = useState(true);
	const [tab, setTab] = useState<Tab>("overview");
	const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
	const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
	const [exportFrom, setExportFrom] = useState("");
	const [exportTo, setExportTo] = useState("");

	// Tooltip state for interactive bar and line charts
	const [tooltip, setTooltip] = useState<TooltipState | null>(null);

	// Role guard
	useEffect(() => {
		if (user && user.role !== "admin" && user.role !== "finance") {
			router.push("/dashboard");
		}
	}, [user, router]);

	/**
	 * Fetch all sales records from the API
	 * @returns void
	 */

	const load = useCallback(async () => {
		setLoading(true);
		try {
			const params = new URLSearchParams();
			params.set("limit", "5000");
			const { sales: fetched } = await api.get<{ sales: Sale[]; total: number }>(
				`/sales?${params}`,
			);
			setAllSales(fetched);
		} catch {
			showToast("Erreur de chargement des donn\u00e9es comptables", "error");
		} finally {
			setLoading(false);
		}
	}, [showToast]);

	useEffect(() => {
		load();
	}, [load]);

	if (user && user.role !== "admin" && user.role !== "finance") return null;

	// Available years derived from sales data
	const availableYears = useMemo(() => {
		const years = new Set<number>();
		for (const s of allSales) {
			years.add(new Date(s.date).getFullYear());
		}
		const current = new Date().getFullYear();
		years.add(current);
		years.add(current - 1);
		return Array.from(years).sort((a, b) => b - a);
	}, [allSales]);

	// Sales filtered to selected year
	const yearSales = useMemo(
		() => allSales.filter((s) => new Date(s.date).getFullYear() === selectedYear),
		[allSales, selectedYear],
	);

	const completedYearSales = useMemo(
		() => yearSales.filter((s) => s.status === "completed"),
		[yearSales],
	);

	// Previous year completed sales for comparison
	const prevYearSales = useMemo(
		() =>
			allSales
				.filter((s) => new Date(s.date).getFullYear() === selectedYear - 1)
				.filter((s) => s.status === "completed"),
		[allSales, selectedYear],
	);

	// Monthly aggregation for the selected year
	const monthRows: MonthRow[] = useMemo(() => {
		const rows: MonthRow[] = [];
		for (let m = 0; m < 12; m++) {
			const monthSales = completedYearSales.filter((s) => {
				const d = new Date(s.date);
				return d.getMonth() === m;
			});
			const grossTTC = monthSales.reduce((sum, s) => sum + s.totalTTC, 0);
			const grossHT = monthSales.reduce((sum, s) => sum + s.totalHT, 0);
			const tva = grossTTC - grossHT;
			const avgSale = monthSales.length > 0 ? grossTTC / monthSales.length : 0;
			rows.push({
				month: m,
				year: selectedYear,
				label: `${MONTH_NAMES[m]} ${selectedYear}`,
				count: monthSales.length,
				grossTTC,
				grossHT,
				tva,
				avgSale,
				sales: monthSales,
			});
		}
		return rows;
	}, [completedYearSales, selectedYear]);

	// Previous year monthly rows for comparison chart
	const prevMonthRows: MonthRow[] = useMemo(() => {
		const rows: MonthRow[] = [];
		for (let m = 0; m < 12; m++) {
			const monthSales = prevYearSales.filter((s) => new Date(s.date).getMonth() === m);
			const grossTTC = monthSales.reduce((sum, s) => sum + s.totalTTC, 0);
			const grossHT = monthSales.reduce((sum, s) => sum + s.totalHT, 0);
			rows.push({
				month: m,
				year: selectedYear - 1,
				label: `${MONTH_NAMES[m]} ${selectedYear - 1}`,
				count: monthSales.length,
				grossTTC,
				grossHT,
				tva: grossTTC - grossHT,
				avgSale: monthSales.length > 0 ? grossTTC / monthSales.length : 0,
				sales: monthSales,
			});
		}
		return rows;
	}, [prevYearSales, selectedYear]);

	// Annual totals
	const totalTTC = completedYearSales.reduce((sum, s) => sum + s.totalTTC, 0);
	const totalHT = completedYearSales.reduce((sum, s) => sum + s.totalHT, 0);
	const totalTVA = totalTTC - totalHT;
	const totalTransactions = completedYearSales.length;
	const monthlyAvg = totalTTC / 12;

	const prevTotalTTC = prevYearSales.reduce((sum, s) => sum + s.totalTTC, 0);

	// Best and worst performing months
	const monthsWithSales = monthRows.filter((r) => r.count > 0);
	const bestMonth =
		monthsWithSales.length > 0
			? monthsWithSales.reduce((a, b) => (a.grossTTC > b.grossTTC ? a : b))
			: null;
	const worstMonth =
		monthsWithSales.length > 0
			? monthsWithSales.reduce((a, b) => (a.grossTTC < b.grossTTC ? a : b))
			: null;

	// Year-on-year growth rate
	const growthRate =
		prevTotalTTC > 0 ? ((totalTTC - prevTotalTTC) / prevTotalTTC) * 100 : 0;

	// Platform revenue breakdown
	const platformRows: PlatformRow[] = useMemo(() => {
		const map = new Map<string, { count: number; ttc: number; ht: number }>();
		for (const s of completedYearSales) {
			const key = s.platform || "Direct";
			const existing = map.get(key);
			if (existing) {
				existing.count += 1;
				existing.ttc += s.totalTTC;
				existing.ht += s.totalHT;
			} else {
				map.set(key, { count: 1, ttc: s.totalTTC, ht: s.totalHT });
			}
		}
		return Array.from(map.entries())
			.map(([platform, { count, ttc, ht }]) => ({
				platform,
				count,
				revenueTTC: ttc,
				revenueHT: ht,
				share: totalTTC > 0 ? (ttc / totalTTC) * 100 : 0,
			}))
			.sort((a, b) => b.revenueTTC - a.revenueTTC);
	}, [completedYearSales, totalTTC]);

	// Product revenue breakdown
	const categoryRows: CategoryRow[] = useMemo(() => {
		const map = new Map<string, { count: number; ttc: number; ht: number }>();
		for (const s of completedYearSales) {
			const key = s.product?.name || `Produit #${s.productId}`;
			const existing = map.get(key);
			if (existing) {
				existing.count += s.quantity;
				existing.ttc += s.totalTTC;
				existing.ht += s.totalHT;
			} else {
				map.set(key, { count: s.quantity, ttc: s.totalTTC, ht: s.totalHT });
			}
		}
		return Array.from(map.entries())
			.map(([category, { count, ttc, ht }]) => ({
				category,
				count,
				revenueTTC: ttc,
				revenueHT: ht,
				share: totalTTC > 0 ? (ttc / totalTTC) * 100 : 0,
			}))
			.sort((a, b) => b.revenueTTC - a.revenueTTC);
	}, [completedYearSales, totalTTC]);

	// Seller revenue breakdown
	const sellerRows: SellerRow[] = useMemo(() => {
		const map = new Map<string, { count: number; ttc: number; ht: number }>();
		for (const s of completedYearSales) {
			const key = s.seller?.name || `Vendeur #${s.sellerId}`;
			const existing = map.get(key);
			if (existing) {
				existing.count += s.quantity;
				existing.ttc += s.totalTTC;
				existing.ht += s.totalHT;
			} else {
				map.set(key, { count: s.quantity, ttc: s.totalTTC, ht: s.totalHT });
			}
		}
		return Array.from(map.entries())
			.map(([name, { count, ttc, ht }]) => ({
				name,
				count,
				revenueTTC: ttc,
				revenueHT: ht,
				share: totalTTC > 0 ? (ttc / totalTTC) * 100 : 0,
			}))
			.sort((a, b) => b.revenueTTC - a.revenueTTC);
	}, [completedYearSales, totalTTC]);

	// Quarterly TVA breakdown for déclaration
	const quarterRows: QuarterRow[] = useMemo(() => {
		const quarters: QuarterRow[] = [];
		for (let q = 0; q < 4; q++) {
			const startMonth = q * 3;
			const qMonths = monthRows.slice(startMonth, startMonth + 3);
			const tvaCollected = qMonths.reduce((sum, r) => sum + r.tva, 0);
			const baseHT = qMonths.reduce((sum, r) => sum + r.grossHT, 0);
			quarters.push({
				label: QUARTER_LABELS[q],
				quarterIndex: q,
				tvaCollected,
				baseHT,
				monthBreakdown: qMonths.map((r) => ({
					label: MONTH_NAMES[r.month],
					tva: r.tva,
					ht: r.grossHT,
				})),
			});
		}
		return quarters;
	}, [monthRows]);

	// Forecast base values
	const currentMonth = new Date().getMonth();
	const currentMonthIndex = selectedYear === new Date().getFullYear() ? currentMonth : 11;
	const completedMonthsCount = monthRows
		.slice(0, currentMonthIndex + 1)
		.filter((r) => r.count > 0).length;
	const revenueToDate = monthRows
		.slice(0, currentMonthIndex + 1)
		.reduce((sum, r) => sum + r.grossTTC, 0);
	const monthlyAvgToDate =
		completedMonthsCount > 0 ? revenueToDate / completedMonthsCount : 0;
	const yearEndEstimate = monthlyAvgToDate * 12;

	// Last 3 months average for optimistic projection
	const recentMonths = monthRows
		.slice(Math.max(0, currentMonthIndex - 2), currentMonthIndex + 1)
		.filter((r) => r.count > 0);
	const recentAvg =
		recentMonths.length > 0
			? recentMonths.reduce((s, r) => s + r.grossTTC, 0) / recentMonths.length
			: 0;
	const remainingMonths = 12 - currentMonthIndex - 1;
	const optimisticEstimate = recentAvg * remainingMonths + revenueToDate;

	// Chart scale maximum across both years
	const chartMaxRevenue = Math.max(
		...monthRows.map((r) => r.grossTTC),
		...prevMonthRows.map((r) => r.grossTTC),
		1,
	);

	/**
	 * Toggle the expanded detail row for a given month key
	 * @param key - Unique month key formatted as year-month
	 * @returns void
	 */

	const toggleMonth = (key: string) => {
		setExpandedMonth((prev) => (prev === key ? null : key));
	};

	/**
	 * Show bar chart tooltip near the hovered bar
	 * @param e - Mouse enter event on a bar element
	 * @param row - Monthly data row associated with the bar
	 * @returns void
	 */

	const handleBarMouseEnter = useCallback(
		(e: React.MouseEvent<HTMLDivElement>, row: MonthRow) => {
			setTooltip({ x: e.clientX, y: e.clientY, data: row });
		},
		[],
	);

	/**
	 * Hide the bar chart tooltip on mouse leave
	 * @returns void
	 */

	const handleBarMouseLeave = useCallback(() => {
		setTooltip(null);
	}, []);

	/**
	 * Show dot tooltip near the hovered SVG circle data point
	 * @param e - Mouse enter event on an SVG element
	 * @param row - Monthly data row associated with the point
	 * @returns void
	 */

	const handleDotMouseEnter = useCallback(
		(e: React.MouseEvent<SVGCircleElement>, row: MonthRow) => {
			setTooltip({ x: e.clientX, y: e.clientY, data: row });
		},
		[],
	);

	/**
	 * Hide the dot tooltip on mouse leave
	 * @returns void
	 */

	const handleDotMouseLeave = useCallback(() => {
		setTooltip(null);
	}, []);

	/**
	 * Generate and download a CSV file from filtered completed sales
	 * @param sales - Full list of completed sales to export
	 * @param from - ISO date string for range start (inclusive)
	 * @param to - ISO date string for range end (inclusive)
	 * @returns void
	 */

	const generateCsvExport = useCallback(
		(sales: Sale[], from: string, to: string) => {
			// Filter by date range if specified
			const filtered = sales.filter((s) => {
				const d = new Date(s.date).toISOString().slice(0, 10);
				return (!from || d >= from) && (!to || d <= to);
			});

			if (filtered.length === 0) {
				showToast("Aucune vente dans la p\u00e9riode s\u00e9lectionn\u00e9e", "error");
				return;
			}

			// Build CSV header and rows
			const headers = [
				"Date",
				"Produit",
				"Vendeur",
				"Plateforme",
				"Quantit\u00e9",
				"Prix unitaire HT",
				"Prix unitaire TTC",
				"Total HT",
				"TVA",
				"Total TTC",
				"Statut",
			];

			const rows = filtered.map((s) => [
				formatDate(s.date),
				s.product?.name || "",
				s.seller?.name || "",
				s.platform || "Direct",
				s.quantity,
				s.unitPriceHT.toFixed(2),
				s.unitPriceTTC.toFixed(2),
				s.totalHT.toFixed(2),
				(s.totalTTC - s.totalHT).toFixed(2),
				s.totalTTC.toFixed(2),
				s.status,
			]);

			// Escape and join cells
			const escape = (v: string | number) =>
				`"${String(v).replace(/"/g, '""')}"`;
			const csvContent = [headers, ...rows]
				.map((row) => row.map(escape).join(","))
				.join("\n");

			// Trigger download
			const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = `comptabilite_${from || selectedYear}_${to || selectedYear}.csv`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);

			showToast(`${filtered.length} ventes export\u00e9es en CSV`, "success");
		},
		[showToast, selectedYear],
	);

	// SVG line chart coordinates for the Prévisions chart
	const svgWidth = 580;
	const svgHeight = 130;
	const svgPadX = 10;
	const svgPadY = 15;
	const chartMaxForecast = Math.max(
		...monthRows.map((r) => r.grossTTC),
		recentAvg,
		1,
	);

	/**
	 * Compute SVG x position for a month index
	 * @param i - Month index 0 to 11
	 * @returns SVG x coordinate
	 */

	const svgX = (i: number): number =>
		svgPadX + (i / 11) * (svgWidth - svgPadX * 2);

	/**
	 * Compute SVG y position for a revenue value
	 * @param value - Revenue value in euros
	 * @returns SVG y coordinate
	 */

	const svgY = (value: number): number =>
		svgHeight - svgPadY - (value / chartMaxForecast) * (svgHeight - svgPadY * 2);

	// Build polyline points string for actual monthly revenue
	const actualPoints = monthRows
		.filter((r) => r.grossTTC > 0)
		.map((r) => `${svgX(r.month)},${svgY(r.grossTTC)}`)
		.join(" ");

	// Build polyline points string for projected months
	const projectedPoints = monthRows
		.map((r, i) => {
			const isFuture =
				selectedYear === new Date().getFullYear() && i > currentMonth;
			if (!isFuture) return null;
			return `${svgX(i)},${svgY(recentAvg)}`;
		})
		.filter(Boolean)
		.join(" ");

	// Render
	return (
		<div>
			{/* Page header */}
			<div className="page-header-box">
				<div className="phb-left">
					<div className="phb-icon">
						<svg
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2">
							<rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
							<line x1="8" y1="21" x2="16" y2="21" />
							<line x1="12" y1="17" x2="12" y2="21" />
						</svg>
					</div>
					<div className="phb-text">
						<h1>Comptabilit\u00e9</h1>
						<p className="page-description">
							Analyse financi\u00e8re, TVA et pr\u00e9visions
						</p>
					</div>
				</div>

				{/* Year selector */}
				<div className="page-header-box-actions">
					<select
						value={selectedYear}
						onChange={(e) => setSelectedYear(Number(e.target.value))}
						style={{
							padding: "0.5rem 0.85rem",
							border: "1.5px solid var(--border-color)",
							borderRadius: "8px",
							background: "var(--card-bg)",
							color: "var(--text)",
							fontSize: "0.875rem",
							fontWeight: 600,
							fontFamily: "inherit",
							cursor: "pointer",
						}}>
						{availableYears.map((y) => (
							<option key={y} value={y}>
								{y}
							</option>
						))}
					</select>
				</div>
			</div>

			{/* Tab navigation */}
			<div
				style={{
					display: "flex",
					gap: "0.3rem",
					background: "var(--bg-alt)",
					borderRadius: "10px",
					padding: "0.3rem",
					marginBottom: "1.25rem",
					overflowX: "auto",
				}}>
				{(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
					<PillButton key={t} active={tab === t} onClick={() => setTab(t)}>
						{TAB_ICONS[t]}
						{TAB_LABELS[t]}
					</PillButton>
				))}
			</div>

			{/* Top-level financial KPI strip (always visible) */}
			<div
				className="stats-grid"
				style={{ gridTemplateColumns: "repeat(4,1fr)", marginBottom: "1.25rem" }}>
				{[
					{
						label: "CA annuel TTC",
						value: formatCurrency(totalTTC),
						sub: `${totalTransactions} facture${totalTransactions !== 1 ? "s" : ""}`,
					},
					{
						label: "CA HT",
						value: formatCurrency(totalHT),
						sub: "Hors taxes",
					},
					{
						label: "TVA collect\u00e9e",
						value: formatCurrency(totalTVA),
						sub: `Taux ${(TVA_RATE * 100).toFixed(0)}\u00a0%`,
					},
					{
						label: "Moyenne mensuelle TTC",
						value: formatCurrency(monthlyAvg),
						sub: `${selectedYear}`,
					},
				].map((s) => (
					<div key={s.label} className="stat-card">
						<div className="stat-info">
							<div className="stat-value" style={{ fontSize: "1.05rem" }}>
								{s.value}
							</div>
							<div className="stat-label">{s.label}</div>
							<div
								style={{
									fontSize: "0.72rem",
									color: "var(--text-muted)",
									marginTop: "0.15rem",
								}}>
								{s.sub}
							</div>
						</div>
					</div>
				))}
			</div>

			{/* TAB: Vue d'ensemble */}
			{tab === "overview" && (
				<div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
					{/* Detailed financial KPIs */}
					<div
						className="stats-grid"
						style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
						{[
							{
								label: "CA HT",
								value: formatCurrency(totalHT),
								sub: "Hors taxe",
								color: "var(--accent)",
							},
							{
								label: "TVA collect\u00e9e",
								value: formatCurrency(totalTVA),
								sub: `Taux ${(TVA_RATE * 100).toFixed(0)}\u00a0%`,
								color: "var(--warning)",
							},
							{
								label: "CA net TTC",
								value: formatCurrency(totalTTC),
								sub: "Toutes taxes comprises",
								color: "var(--success)",
							},
							{
								label: "Meilleur mois",
								value: bestMonth ? MONTH_NAMES[bestMonth.month] : "\u2014",
								sub: bestMonth ? formatCurrency(bestMonth.grossTTC) : "Aucune donn\u00e9e",
								color: "var(--text)",
							},
						].map((s) => (
							<div key={s.label} className="stat-card">
								<div className="stat-info">
									<div
										className="stat-value"
										style={{ fontSize: "1.1rem", color: s.color }}>
										{s.value}
									</div>
									<div className="stat-label">{s.label}</div>
									<div
										style={{
											fontSize: "0.72rem",
											color: "var(--text-muted)",
											marginTop: "0.15rem",
										}}>
										{s.sub}
									</div>
								</div>
							</div>
						))}
					</div>

					{/* Year-on-year comparison banner */}
					{prevTotalTTC > 0 && (
						<div
							className="card"
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								gap: "1.5rem",
							}}>
							<div>
								<div
									style={{
										fontSize: "0.78rem",
										color: "var(--text-muted)",
										marginBottom: "0.25rem",
									}}>
									Comparaison ann\u00e9e pr\u00e9c\u00e9dente ({selectedYear - 1})
								</div>
								<div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem" }}>
									<span style={{ fontSize: "1rem", fontWeight: 700 }}>
										{formatCurrency(totalTTC)}
									</span>
									<span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
										vs {formatCurrency(prevTotalTTC)}
									</span>
								</div>
							</div>
							<div
								style={{
									padding: "0.45rem 0.85rem",
									borderRadius: "8px",
									fontWeight: 700,
									fontSize: "0.88rem",
									background:
										growthRate >= 0
											? "rgba(34,197,94,0.12)"
											: "rgba(239,68,68,0.12)",
									color: growthRate >= 0 ? "var(--success)" : "var(--danger)",
								}}>
								{growthRate >= 0 ? "+" : ""}
								{growthRate.toFixed(1)}\u00a0%
							</div>
						</div>
					)}

					{/* Monthly financial breakdown table */}
					<SectionCard
						title={`R\u00e9capitulatif mensuel \u2014 ${selectedYear}`}
						noPadding>
						{loading ? (
							<div className="empty-state">
								<p>Chargement\u2026</p>
							</div>
						) : (
							<div style={{ overflowX: "auto" }}>
								<table className="data-table">
									<thead>
										<tr>
											<th>Mois</th>
											<th style={{ textAlign: "right" }}>Ventes</th>
											<th style={{ textAlign: "right" }}>CA TTC</th>
											<th style={{ textAlign: "right" }}>CA HT</th>
											<th style={{ textAlign: "right" }}>TVA</th>
											<th style={{ textAlign: "right" }}>No. factures</th>
										</tr>
									</thead>
									<tbody>
										{monthRows.map((row) => (
											<tr key={row.month}>
												<td
													style={{
														fontWeight: row.count > 0 ? 600 : 400,
														color:
															row.count > 0 ? "var(--text)" : "var(--text-muted)",
													}}>
													{MONTH_NAMES[row.month]}
												</td>
												<td style={{ textAlign: "right", fontSize: "0.875rem" }}>
													{row.count > 0 ? row.count : "\u2014"}
												</td>
												<td
													style={{
														textAlign: "right",
														fontSize: "0.875rem",
														fontWeight: row.count > 0 ? 700 : 400,
														color:
															row.count > 0 ? "var(--accent)" : "var(--text-muted)",
													}}>
													{row.count > 0 ? formatCurrency(row.grossTTC) : "\u2014"}
												</td>
												<td
													style={{
														textAlign: "right",
														fontSize: "0.875rem",
													}}>
													{row.count > 0 ? formatCurrency(row.grossHT) : "\u2014"}
												</td>
												<td
													style={{
														textAlign: "right",
														fontSize: "0.875rem",
														color: row.count > 0 ? "var(--warning)" : "var(--text-muted)",
													}}>
													{row.count > 0 ? formatCurrency(row.tva) : "\u2014"}
												</td>
												<td
													style={{
														textAlign: "right",
														fontSize: "0.875rem",
														color: "var(--text-muted)",
													}}>
													{row.count > 0 ? row.count : "\u2014"}
												</td>
											</tr>
										))}
									</tbody>
									<tfoot>
										<tr style={{ borderTop: "2px solid var(--border-color)" }}>
											<td style={{ fontWeight: 700 }}>Total</td>
											<td style={{ textAlign: "right", fontWeight: 700 }}>
												{totalTransactions}
											</td>
											<td
												style={{
													textAlign: "right",
													fontWeight: 700,
													color: "var(--accent)",
												}}>
												{formatCurrency(totalTTC)}
											</td>
											<td style={{ textAlign: "right", fontWeight: 700 }}>
												{formatCurrency(totalHT)}
											</td>
											<td
												style={{
													textAlign: "right",
													fontWeight: 700,
													color: "var(--warning)",
												}}>
												{formatCurrency(totalTVA)}
											</td>
											<td
												style={{
													textAlign: "right",
													fontWeight: 700,
													color: "var(--text-muted)",
												}}>
												{totalTransactions}
											</td>
										</tr>
									</tfoot>
								</table>
							</div>
						)}
					</SectionCard>

					{/* Interactive monthly bar chart with hover tooltips */}
					<SectionCard
						title={`Revenus mensuels \u2014 ${selectedYear} vs ${selectedYear - 1}`}>
						{loading ? (
							<div className="empty-state">
								<p>Chargement\u2026</p>
							</div>
						) : (
							<div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
								{monthRows.map((row, i) => {
									const prevRow = prevMonthRows[i];
									const barWidth =
										chartMaxRevenue > 0
											? (row.grossTTC / chartMaxRevenue) * 100
											: 0;
									const prevBarWidth =
										chartMaxRevenue > 0
											? (prevRow.grossTTC / chartMaxRevenue) * 100
											: 0;
									return (
										<div key={i}>
											<div
												style={{
													display: "grid",
													gridTemplateColumns: "80px 1fr 110px",
													alignItems: "center",
													gap: "0.75rem",
												}}>
												<span
													style={{
														fontSize: "0.78rem",
														fontWeight: 600,
														color:
															row.count > 0
																? "var(--text)"
																: "var(--text-muted)",
													}}>
													{MONTH_SHORT[i]}
												</span>
												<div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
													{/* Current year bar, interactive */}
													<div
														onMouseEnter={(e) =>
															row.grossTTC > 0 && handleBarMouseEnter(e, row)
														}
														onMouseLeave={handleBarMouseLeave}
														style={{
															height: "16px",
															width: `${Math.max(barWidth, 0.5)}%`,
															background: "var(--accent)",
															borderRadius: "4px",
															opacity: row.grossTTC > 0 ? 1 : 0.15,
															transition: "width 0.3s ease",
															cursor: row.grossTTC > 0 ? "pointer" : "default",
														}}
													/>
													{/* Previous year bar (non-interactive reference) */}
													<div
														style={{
															height: "10px",
															width: `${Math.max(prevBarWidth, 0.5)}%`,
															background: "var(--text-muted)",
															borderRadius: "3px",
															opacity: prevRow.grossTTC > 0 ? 0.4 : 0.1,
															transition: "width 0.3s ease",
														}}
													/>
												</div>
												<span
													style={{
														fontSize: "0.78rem",
														fontWeight: 700,
														textAlign: "right",
														color:
															row.count > 0
																? "var(--accent)"
																: "var(--text-muted)",
													}}>
													{row.grossTTC > 0
														? formatCurrency(row.grossTTC)
														: "\u2014"}
												</span>
											</div>
										</div>
									);
								})}

								{/* Legend */}
								<div
									style={{
										display: "flex",
										gap: "1.5rem",
										marginTop: "0.5rem",
										paddingTop: "0.5rem",
										borderTop: "1px solid var(--border-color)",
									}}>
									<div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
										<div
											style={{
												width: "12px",
												height: "12px",
												borderRadius: "3px",
												background: "var(--accent)",
											}}
										/>
										<span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
											{selectedYear}
										</span>
									</div>
									<div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
										<div
											style={{
												width: "12px",
												height: "12px",
												borderRadius: "3px",
												background: "var(--text-muted)",
												opacity: 0.4,
											}}
										/>
										<span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
											{selectedYear - 1}
										</span>
									</div>
									<span
										style={{
											marginLeft: "auto",
											fontSize: "0.72rem",
											color: "var(--text-muted)",
											fontStyle: "italic",
										}}>
										Survolez une barre pour d\u00e9tails
									</span>
								</div>
							</div>
						)}
					</SectionCard>

					{/* Financial health and status breakdown */}
					<div
						style={{
							display: "grid",
							gridTemplateColumns: "1fr 1fr",
							gap: "1.25rem",
						}}>
						<SectionCard title="Indicateurs de sant\u00e9 financi\u00e8re">
							<HealthIndicator
								label="Croissance annuelle"
								value={`${growthRate >= 0 ? "+" : ""}${growthRate.toFixed(1)}\u00a0%`}
								status={
									growthRate > 10
										? "success"
										: growthRate > 0
											? "warning"
											: "danger"
								}
							/>
							<HealthIndicator
								label="Panier moyen TTC"
								value={
									totalTransactions > 0
										? formatCurrency(totalTTC / totalTransactions)
										: "\u2014"
								}
								status="neutral"
							/>
							<HealthIndicator
								label="Mois actifs sur {12}"
								value={`${monthsWithSales.length} / 12`}
								status={
									monthsWithSales.length >= 10
										? "success"
										: monthsWithSales.length >= 6
											? "warning"
											: "danger"
								}
							/>
							<HealthIndicator
								label="Taux de compl\u00e9tion des ventes"
								value={`${
									yearSales.length > 0
										? ((completedYearSales.length / yearSales.length) * 100).toFixed(1)
										: "0"
								}\u00a0%`}
								status={
									yearSales.length > 0 &&
									completedYearSales.length / yearSales.length > 0.85
										? "success"
										: yearSales.length > 0 &&
												completedYearSales.length / yearSales.length > 0.65
											? "warning"
											: "danger"
								}
							/>
							<HealthIndicator
								label="Mois le plus faible"
								value={
									worstMonth
										? `${MONTH_NAMES[worstMonth.month]} \u2014 ${formatCurrency(worstMonth.grossTTC)}`
										: "\u2014"
								}
								status="neutral"
							/>
						</SectionCard>

						{/* Sales status financial split */}
						<SectionCard title="R\u00e9partition financi\u00e8re par statut">
							{[
								{
									label: "Compl\u00e9t\u00e9es",
									count: completedYearSales.length,
									ttc: totalTTC,
									badge: "badge-success",
								},
								{
									label: "En attente",
									count: yearSales.filter((s) => s.status === "postponed").length,
									ttc: yearSales
										.filter((s) => s.status === "postponed")
										.reduce((sum, s) => sum + s.totalTTC, 0),
									badge: "badge-warning",
								},
								{
									label: "Annul\u00e9es",
									count: yearSales.filter((s) => s.status === "cancelled").length,
									ttc: 0,
									badge: "badge-danger",
								},
							].map((row) => (
								<div
									key={row.label}
									style={{
										display: "flex",
										alignItems: "center",
										justifyContent: "space-between",
										padding: "0.65rem 0",
										borderBottom: "1px solid var(--border-color)",
									}}>
									<div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
										<span className={`badge ${row.badge}`} style={{ fontSize: "0.72rem" }}>
											{row.label}
										</span>
										<span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
											{row.count} vente{row.count !== 1 ? "s" : ""}
										</span>
									</div>
									<span style={{ fontWeight: 600, fontSize: "0.875rem" }}>
										{row.ttc > 0 ? formatCurrency(row.ttc) : "\u2014"}
									</span>
								</div>
							))}
						</SectionCard>
					</div>
				</div>
			)}

			{/* TAB: Revenus */}
			{tab === "revenus" && (
				<div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
					{/* Expandable monthly revenue table */}
					<SectionCard
						title={`D\u00e9tail des revenus mensuels \u2014 ${selectedYear}`}
						noPadding>
						{loading ? (
							<div className="empty-state">
								<p>Chargement\u2026</p>
							</div>
						) : (
							<div style={{ overflowX: "auto" }}>
								<table className="data-table">
									<thead>
										<tr>
											<th>Mois</th>
											<th style={{ textAlign: "right" }}>Nb ventes</th>
											<th style={{ textAlign: "right" }}>CA TTC</th>
											<th style={{ textAlign: "right" }}>TVA</th>
											<th style={{ textAlign: "right" }}>CA HT</th>
											<th style={{ textAlign: "right" }}>Vente moy.</th>
											<th style={{ textAlign: "center", width: "40px" }}></th>
										</tr>
									</thead>
									<tbody>
										{monthRows.map((row) => {
											const key = `${row.year}-${row.month}`;
											const isExpanded = expandedMonth === key;
											return (
												<React.Fragment key={key}>
													<tr
														onClick={() => row.count > 0 && toggleMonth(key)}
														style={{
															cursor: row.count > 0 ? "pointer" : "default",
															background: isExpanded ? "var(--bg-alt)" : undefined,
														}}>
														<td
															style={{
																fontWeight: row.count > 0 ? 600 : 400,
																color:
																	row.count > 0
																		? "var(--text)"
																		: "var(--text-muted)",
															}}>
															{MONTH_NAMES[row.month]}
														</td>
														<td style={{ textAlign: "right", fontSize: "0.875rem" }}>
															{row.count}
														</td>
														<td
															style={{
																textAlign: "right",
																fontSize: "0.875rem",
																fontWeight: row.count > 0 ? 700 : 400,
																color:
																	row.count > 0
																		? "var(--accent)"
																		: "var(--text-muted)",
															}}>
															{row.count > 0 ? formatCurrency(row.grossTTC) : "\u2014"}
														</td>
														<td
															style={{
																textAlign: "right",
																fontSize: "0.875rem",
																color: "var(--text-muted)",
															}}>
															{row.count > 0 ? formatCurrency(row.tva) : "\u2014"}
														</td>
														<td style={{ textAlign: "right", fontSize: "0.875rem" }}>
															{row.count > 0 ? formatCurrency(row.grossHT) : "\u2014"}
														</td>
														<td style={{ textAlign: "right", fontSize: "0.875rem" }}>
															{row.count > 0 ? formatCurrency(row.avgSale) : "\u2014"}
														</td>
														<td style={{ textAlign: "center" }}>
															{row.count > 0 && (
																<svg
																	width="12"
																	height="12"
																	viewBox="0 0 24 24"
																	fill="none"
																	stroke="currentColor"
																	strokeWidth="2"
																	style={{
																		transform: isExpanded
																			? "rotate(180deg)"
																			: "rotate(0deg)",
																		transition: "transform 0.2s",
																		color: "var(--text-muted)",
																	}}>
																	<polyline points="6 9 12 15 18 9" />
																</svg>
															)}
														</td>
													</tr>

													{/* Expanded individual sales for the month */}
													{isExpanded && row.sales.length > 0 && (
														<tr key={`${key}-detail`}>
															<td
																colSpan={7}
																style={{
																	padding: 0,
																	background: "var(--bg-alt)",
																}}>
																<div style={{ padding: "0.5rem 1rem 0.75rem" }}>
																	<table
																		style={{
																			width: "100%",
																			fontSize: "0.78rem",
																			borderCollapse: "collapse",
																		}}>
																		<thead>
																			<tr
																				style={{
																					borderBottom:
																						"1px solid var(--border-color)",
																				}}>
																				{["Date", "Produit", "Vendeur", "Plateforme", "Qté", "Total TTC"].map(
																					(h) => (
																						<th
																							key={h}
																							style={{
																								padding: "0.35rem 0.5rem",
																								textAlign:
																									h === "Qté" || h === "Total TTC"
																										? "right"
																										: "left",
																								fontWeight: 600,
																								fontSize: "0.72rem",
																								color: "var(--text-muted)",
																								textTransform: "uppercase",
																								letterSpacing: "0.05em",
																							}}>
																							{h}
																						</th>
																					),
																				)}
																			</tr>
																		</thead>
																		<tbody>
																			{row.sales
																				.sort(
																					(a, b) =>
																						new Date(a.date).getTime() -
																						new Date(b.date).getTime(),
																				)
																				.map((sale) => (
																					<tr
																						key={sale.id}
																						style={{
																							borderBottom:
																								"1px solid var(--border-color)",
																						}}>
																						<td
																							style={{
																								padding: "0.4rem 0.5rem",
																								color: "var(--text-muted)",
																								whiteSpace: "nowrap",
																							}}>
																							{formatDate(sale.date)}
																						</td>
																						<td
																							style={{
																								padding: "0.4rem 0.5rem",
																								fontWeight: 600,
																							}}>
																							{sale.product?.name || "\u2014"}
																						</td>
																						<td style={{ padding: "0.4rem 0.5rem" }}>
																							{sale.seller?.name || "\u2014"}
																						</td>
																						<td style={{ padding: "0.4rem 0.5rem" }}>
																							{sale.platform ? (
																								<span
																									className="badge badge-light"
																									style={{ fontSize: "0.68rem" }}>
																									{sale.platform}
																								</span>
																							) : (
																								<span
																									style={{
																										color: "var(--text-muted)",
																									}}>
																									\u2014
																								</span>
																							)}
																						</td>
																						<td
																							style={{
																								padding: "0.4rem 0.5rem",
																								textAlign: "right",
																							}}>
																							{sale.quantity}
																						</td>
																						<td
																							style={{
																								padding: "0.4rem 0.5rem",
																								textAlign: "right",
																								fontWeight: 700,
																								color: "var(--accent)",
																							}}>
																							{formatCurrency(sale.totalTTC)}
																						</td>
																					</tr>
																				))}
																		</tbody>
																	</table>
																</div>
															</td>
														</tr>
													)}
												</React.Fragment>
											);
										})}
									</tbody>
									<tfoot>
										<tr style={{ borderTop: "2px solid var(--border-color)" }}>
											<td style={{ fontWeight: 700 }}>Total</td>
											<td style={{ textAlign: "right", fontWeight: 700 }}>
												{totalTransactions}
											</td>
											<td
												style={{
													textAlign: "right",
													fontWeight: 700,
													color: "var(--accent)",
												}}>
												{formatCurrency(totalTTC)}
											</td>
											<td
												style={{
													textAlign: "right",
													fontWeight: 700,
													color: "var(--text-muted)",
												}}>
												{formatCurrency(totalTVA)}
											</td>
											<td style={{ textAlign: "right", fontWeight: 700 }}>
												{formatCurrency(totalHT)}
											</td>
											<td style={{ textAlign: "right", fontWeight: 700 }}>
												{totalTransactions > 0
													? formatCurrency(totalTTC / totalTransactions)
													: "\u2014"}
											</td>
											<td></td>
										</tr>
										<tr>
											<td
												style={{
													fontWeight: 600,
													color: "var(--text-muted)",
												}}>
												Moyenne / mois
											</td>
											<td
												style={{
													textAlign: "right",
													color: "var(--text-muted)",
													fontSize: "0.85rem",
												}}>
												{(totalTransactions / 12).toFixed(1)}
											</td>
											<td
												style={{
													textAlign: "right",
													color: "var(--text-muted)",
													fontSize: "0.85rem",
												}}>
												{formatCurrency(totalTTC / 12)}
											</td>
											<td
												style={{
													textAlign: "right",
													color: "var(--text-muted)",
													fontSize: "0.85rem",
												}}>
												{formatCurrency(totalTVA / 12)}
											</td>
											<td
												style={{
													textAlign: "right",
													color: "var(--text-muted)",
													fontSize: "0.85rem",
												}}>
												{formatCurrency(totalHT / 12)}
											</td>
											<td></td>
											<td></td>
										</tr>
									</tfoot>
								</table>
							</div>
						)}
					</SectionCard>

					{/* Platform, product and seller breakdowns */}
					<div
						style={{
							display: "grid",
							gridTemplateColumns: "1fr 1fr 1fr",
							gap: "1.25rem",
						}}>
						{/* By platform */}
						<SectionCard title="Par plateforme" noPadding>
							{platformRows.length === 0 ? (
								<div className="empty-state" style={{ padding: "1.5rem" }}>
									<p style={{ fontSize: "0.82rem" }}>Aucune donn\u00e9e</p>
								</div>
							) : (
								<table className="data-table">
									<thead>
										<tr>
											<th>Plateforme</th>
											<th style={{ textAlign: "right" }}>CA TTC</th>
											<th style={{ textAlign: "right" }}>Part</th>
										</tr>
									</thead>
									<tbody>
										{platformRows.map((row) => (
											<tr key={row.platform}>
												<td>
													<span
														className="badge badge-light"
														style={{ fontSize: "0.72rem" }}>
														{row.platform}
													</span>
													<div
														style={{
															fontSize: "0.72rem",
															color: "var(--text-muted)",
															marginTop: "0.15rem",
														}}>
														{row.count} vente{row.count !== 1 ? "s" : ""}
													</div>
												</td>
												<td
													style={{
														textAlign: "right",
														fontSize: "0.82rem",
														fontWeight: 600,
													}}>
													{formatCurrency(row.revenueTTC)}
												</td>
												<td style={{ textAlign: "right" }}>
													<span
														className="badge badge-light"
														style={{ fontSize: "0.68rem" }}>
														{row.share.toFixed(1)}\u00a0%
													</span>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							)}
						</SectionCard>

						{/* By product */}
						<SectionCard title="Par produit" noPadding>
							{categoryRows.length === 0 ? (
								<div className="empty-state" style={{ padding: "1.5rem" }}>
									<p style={{ fontSize: "0.82rem" }}>Aucune donn\u00e9e</p>
								</div>
							) : (
								<table className="data-table">
									<thead>
										<tr>
											<th>Produit</th>
											<th style={{ textAlign: "right" }}>CA TTC</th>
											<th style={{ textAlign: "right" }}>Part</th>
										</tr>
									</thead>
									<tbody>
										{categoryRows.slice(0, 10).map((row) => (
											<tr key={row.category}>
												<td
													style={{
														fontSize: "0.82rem",
														fontWeight: 600,
														maxWidth: "140px",
														overflow: "hidden",
														textOverflow: "ellipsis",
														whiteSpace: "nowrap",
													}}>
													{row.category}
													<div
														style={{
															fontSize: "0.72rem",
															color: "var(--text-muted)",
															fontWeight: 400,
															marginTop: "0.1rem",
														}}>
														{row.count} unit\u00e9{row.count !== 1 ? "s" : ""}
													</div>
												</td>
												<td
													style={{
														textAlign: "right",
														fontSize: "0.82rem",
														fontWeight: 600,
													}}>
													{formatCurrency(row.revenueTTC)}
												</td>
												<td style={{ textAlign: "right" }}>
													<span
														className="badge badge-light"
														style={{ fontSize: "0.68rem" }}>
														{row.share.toFixed(1)}\u00a0%
													</span>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							)}
						</SectionCard>

						{/* By seller */}
						<SectionCard title="Par vendeur" noPadding>
							{sellerRows.length === 0 ? (
								<div className="empty-state" style={{ padding: "1.5rem" }}>
									<p style={{ fontSize: "0.82rem" }}>Aucune donn\u00e9e</p>
								</div>
							) : (
								<table className="data-table">
									<thead>
										<tr>
											<th>Vendeur</th>
											<th style={{ textAlign: "right" }}>CA TTC</th>
											<th style={{ textAlign: "right" }}>Part</th>
										</tr>
									</thead>
									<tbody>
										{sellerRows.map((row) => (
											<tr key={row.name}>
												<td
													style={{
														fontSize: "0.82rem",
														fontWeight: 600,
													}}>
													{row.name}
													<div
														style={{
															fontSize: "0.72rem",
															color: "var(--text-muted)",
															fontWeight: 400,
															marginTop: "0.1rem",
														}}>
														{row.count} unit\u00e9{row.count !== 1 ? "s" : ""}
													</div>
												</td>
												<td
													style={{
														textAlign: "right",
														fontSize: "0.82rem",
														fontWeight: 600,
													}}>
													{formatCurrency(row.revenueTTC)}
												</td>
												<td style={{ textAlign: "right" }}>
													<span
														className="badge badge-light"
														style={{ fontSize: "0.68rem" }}>
														{row.share.toFixed(1)}\u00a0%
													</span>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							)}
						</SectionCard>
					</div>
				</div>
			)}

			{/* TAB: TVA */}
			{tab === "tva" && (
				<div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
					{/* TVA annual KPIs */}
					<div
						className="stats-grid"
						style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
						{[
							{
								label: "TVA collect\u00e9e (ann\u00e9e)",
								value: formatCurrency(totalTVA),
								sub: `Taux ${(TVA_RATE * 100).toFixed(0)}\u00a0%`,
							},
							{
								label: "Base HT imposable",
								value: formatCurrency(totalHT),
								sub: "Assiette TVA",
							},
							{
								label: "TVA \u00e0 d\u00e9clarer",
								value: formatCurrency(totalTVA),
								sub: "TVA collect\u00e9e nette",
							},
							{
								label: "TVA mensuelle moy.",
								value: formatCurrency(totalTVA / 12),
								sub: `Moyenne ${selectedYear}`,
							},
						].map((s) => (
							<div key={s.label} className="stat-card">
								<div className="stat-info">
									<div className="stat-value" style={{ fontSize: "1.05rem" }}>
										{s.value}
									</div>
									<div className="stat-label">{s.label}</div>
									<div
										style={{
											fontSize: "0.72rem",
											color: "var(--text-muted)",
											marginTop: "0.15rem",
										}}>
										{s.sub}
									</div>
								</div>
							</div>
						))}
					</div>

					{/* Monthly TVA table */}
					<SectionCard
						title={`TVA collect\u00e9e par mois \u2014 ${selectedYear}`}
						noPadding>
						<div style={{ overflowX: "auto" }}>
							<table className="data-table">
								<thead>
									<tr>
										<th>Mois</th>
										<th style={{ textAlign: "right" }}>Base HT</th>
										<th style={{ textAlign: "right" }}>Taux TVA</th>
										<th style={{ textAlign: "right" }}>TVA collect\u00e9e</th>
										<th style={{ textAlign: "right" }}>CA TTC</th>
										<th style={{ textAlign: "right" }}>% du total TVA</th>
									</tr>
								</thead>
								<tbody>
									{monthRows.map((row) => (
										<tr key={row.month}>
											<td
												style={{
													fontWeight: row.count > 0 ? 600 : 400,
													color:
														row.count > 0 ? "var(--text)" : "var(--text-muted)",
												}}>
												{MONTH_NAMES[row.month]}
											</td>
											<td style={{ textAlign: "right", fontSize: "0.875rem" }}>
												{row.count > 0 ? formatCurrency(row.grossHT) : "\u2014"}
											</td>
											<td
												style={{
													textAlign: "right",
													fontSize: "0.875rem",
													color: "var(--text-muted)",
												}}>
												{row.count > 0
													? `${(TVA_RATE * 100).toFixed(0)}\u00a0%`
													: "\u2014"}
											</td>
											<td
												style={{
													textAlign: "right",
													fontSize: "0.875rem",
													fontWeight: row.count > 0 ? 700 : 400,
													color:
														row.count > 0 ? "var(--warning)" : "var(--text-muted)",
												}}>
												{row.count > 0 ? formatCurrency(row.tva) : "\u2014"}
											</td>
											<td style={{ textAlign: "right", fontSize: "0.875rem" }}>
												{row.count > 0 ? formatCurrency(row.grossTTC) : "\u2014"}
											</td>
											<td
												style={{
													textAlign: "right",
													fontSize: "0.82rem",
													color: "var(--text-muted)",
												}}>
												{row.count > 0 ? `${pct(row.tva, totalTVA)}\u00a0%` : "\u2014"}
											</td>
										</tr>
									))}
								</tbody>
								<tfoot>
									<tr style={{ borderTop: "2px solid var(--border-color)" }}>
										<td style={{ fontWeight: 700 }}>Total annuel</td>
										<td style={{ textAlign: "right", fontWeight: 700 }}>
											{formatCurrency(totalHT)}
										</td>
										<td
											style={{
												textAlign: "right",
												fontWeight: 700,
												color: "var(--text-muted)",
											}}>
											{(TVA_RATE * 100).toFixed(0)}\u00a0%
										</td>
										<td
											style={{
												textAlign: "right",
												fontWeight: 700,
												color: "var(--warning)",
											}}>
											{formatCurrency(totalTVA)}
										</td>
										<td
											style={{
												textAlign: "right",
												fontWeight: 700,
												color: "var(--accent)",
											}}>
											{formatCurrency(totalTTC)}
										</td>
										<td style={{ textAlign: "right", fontWeight: 700 }}>
											100\u00a0%
										</td>
									</tr>
								</tfoot>
							</table>
						</div>
					</SectionCard>

					{/* Quarterly TVA for déclaration */}
					<SectionCard
						title={`TVA par trimestre \u2014 Pr\u00e9paration d\u00e9claration ${selectedYear}`}>
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "repeat(2,1fr)",
								gap: "1rem",
							}}>
							{quarterRows.map((q) => (
								<div
									key={q.quarterIndex}
									style={{
										border: "1.5px solid var(--border-color)",
										borderRadius: "10px",
										overflow: "hidden",
									}}>
									<div
										style={{
											padding: "0.75rem 1rem",
											background: "var(--bg-alt)",
											borderBottom: "1px solid var(--border-color)",
											display: "flex",
											alignItems: "center",
											justifyContent: "space-between",
										}}>
										<span style={{ fontWeight: 700, fontSize: "0.88rem" }}>
											{q.label}
										</span>
										<span
											style={{
												fontWeight: 700,
												fontSize: "0.95rem",
												color: "var(--warning)",
											}}>
											{formatCurrency(q.tvaCollected)}
										</span>
									</div>
									<div style={{ padding: "0.65rem 1rem" }}>
										{q.monthBreakdown.map((mb) => (
											<div
												key={mb.label}
												style={{
													display: "flex",
													justifyContent: "space-between",
													padding: "0.35rem 0",
													fontSize: "0.82rem",
													borderBottom: "1px solid var(--border-color)",
												}}>
												<span style={{ color: "var(--text-muted)" }}>
													{mb.label}
												</span>
												<div style={{ display: "flex", gap: "1.25rem" }}>
													<span
														style={{
															color: "var(--text-muted)",
															fontSize: "0.78rem",
														}}>
														HT: {formatCurrency(mb.ht)}
													</span>
													<span style={{ fontWeight: 600 }}>
														{formatCurrency(mb.tva)}
													</span>
												</div>
											</div>
										))}
										<div
											style={{
												display: "flex",
												justifyContent: "space-between",
												padding: "0.5rem 0 0.25rem",
												fontSize: "0.82rem",
												fontWeight: 700,
											}}>
											<span>Base HT trimestre</span>
											<span>{formatCurrency(q.baseHT)}</span>
										</div>
									</div>
								</div>
							))}
						</div>
					</SectionCard>

					{/* TVA declaration reminder */}
					<div
						className="card"
						style={{
							display: "flex",
							alignItems: "center",
							gap: "0.75rem",
							fontSize: "0.82rem",
							color: "var(--text-muted)",
						}}>
						<svg
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2">
							<circle cx="12" cy="12" r="10" />
							<line x1="12" y1="16" x2="12" y2="12" />
							<line x1="12" y1="8" x2="12.01" y2="8" />
						</svg>
						<span>
							Taux de TVA appliqu\u00e9 : <strong>{(TVA_RATE * 100).toFixed(0)}\u00a0%</strong> (taux normal).
							Les montants TVA sont calcul\u00e9s sur la base TTC\u00a0/\u00a0(1\u00a0+\u00a0taux).
							Pensez \u00e0 d\u00e9clarer la TVA collect\u00e9e chaque trimestre via votre espace professionnel des imp\u00f4ts.
							Ces donn\u00e9es sont indicatives et ne remplacent pas un bilan comptable certifi\u00e9.
						</span>
					</div>
				</div>
			)}

			{/* TAB: Prévisions */}
			{tab === "previsions" && (
				<div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
					{/* Forecast KPIs */}
					<div
						className="stats-grid"
						style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
						{[
							{
								label: "CA \u00e0 ce jour",
								value: formatCurrency(revenueToDate),
								sub: `${currentMonthIndex + 1} mois \u00e9coul\u00e9s`,
							},
							{
								label: "Estimation fin d\u2019ann\u00e9e",
								value: formatCurrency(yearEndEstimate),
								sub: "Projection lin\u00e9aire",
							},
							{
								label: "Projection tendance r\u00e9cente",
								value: formatCurrency(optimisticEstimate),
								sub: `Moy. 3 derniers mois \u00d7 ${remainingMonths} mois restants`,
							},
							{
								label: "Taux de croissance",
								value: `${growthRate >= 0 ? "+" : ""}${growthRate.toFixed(1)}\u00a0%`,
								sub: `vs ${selectedYear - 1}`,
							},
						].map((s) => (
							<div key={s.label} className="stat-card">
								<div className="stat-info">
									<div className="stat-value" style={{ fontSize: "1.05rem" }}>
										{s.value}
									</div>
									<div className="stat-label">{s.label}</div>
									<div
										style={{
											fontSize: "0.72rem",
											color: "var(--text-muted)",
											marginTop: "0.15rem",
										}}>
										{s.sub}
									</div>
								</div>
							</div>
						))}
					</div>

					{/* Interactive SVG line chart: actual vs projected revenue */}
					<SectionCard title={`Courbe de revenus \u2014 ${selectedYear} (survol pour d\u00e9tails)`}>
						<div style={{ overflowX: "auto" }}>
							<svg
								viewBox={`0 0 ${svgWidth} ${svgHeight}`}
								style={{ width: "100%", minWidth: "400px", display: "block" }}>
								{/* Horizontal grid lines */}
								{[0.25, 0.5, 0.75, 1].map((f) => (
									<line
										key={f}
										x1={svgPadX}
										y1={svgY(chartMaxForecast * f)}
										x2={svgWidth - svgPadX}
										y2={svgY(chartMaxForecast * f)}
										stroke="var(--border-color)"
										strokeWidth="0.5"
									/>
								))}

								{/* Month labels on x axis */}
								{MONTH_SHORT.map((label, i) => (
									<text
										key={i}
										x={svgX(i)}
										y={svgHeight - 2}
										textAnchor="middle"
										fontSize="8"
										fill="var(--text-muted)">
										{label}
									</text>
								))}

								{/* Actual revenue polyline */}
								{actualPoints && (
									<polyline
										points={actualPoints}
										fill="none"
										stroke="var(--accent)"
										strokeWidth="2"
										strokeLinejoin="round"
									/>
								)}

								{/* Projected revenue polyline (dashed) */}
								{projectedPoints && (
									<polyline
										points={projectedPoints}
										fill="none"
										stroke="var(--warning)"
										strokeWidth="1.5"
										strokeDasharray="4 3"
										strokeLinejoin="round"
									/>
								)}

								{/* Actual data point dots, interactive */}
								{monthRows.map((row, i) => {
									const isFuture =
										selectedYear === new Date().getFullYear() && i > currentMonth;
									if (isFuture || row.grossTTC === 0) return null;
									return (
										<circle
											key={i}
											cx={svgX(i)}
											cy={svgY(row.grossTTC)}
											r={4}
											fill="var(--accent)"
											stroke="var(--card-bg)"
											strokeWidth="1.5"
											style={{ cursor: "pointer" }}
											onMouseEnter={(e) => handleDotMouseEnter(e, row)}
											onMouseLeave={handleDotMouseLeave}
										/>
									);
								})}

								{/* Projected data point dots, interactive */}
								{monthRows.map((row, i) => {
									const isFuture =
										selectedYear === new Date().getFullYear() && i > currentMonth;
									if (!isFuture || recentAvg === 0) return null;
									const projRow: MonthRow = {
										...row,
										grossTTC: recentAvg,
										grossHT: recentAvg / (1 + TVA_RATE),
										tva: recentAvg - recentAvg / (1 + TVA_RATE),
										label: `${MONTH_NAMES[i]} ${selectedYear} (proj.)`,
									};
									return (
										<circle
											key={`proj-${i}`}
											cx={svgX(i)}
											cy={svgY(recentAvg)}
											r={3}
											fill="var(--warning)"
											stroke="var(--card-bg)"
											strokeWidth="1.5"
											style={{ cursor: "pointer" }}
											onMouseEnter={(e) => handleDotMouseEnter(e, projRow)}
											onMouseLeave={handleDotMouseLeave}
										/>
									);
								})}
							</svg>

							{/* Chart legend */}
							<div
								style={{
									display: "flex",
									gap: "1.5rem",
									marginTop: "0.5rem",
									paddingTop: "0.5rem",
									borderTop: "1px solid var(--border-color)",
								}}>
								<div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
									<div
										style={{
											width: "16px",
											height: "3px",
											background: "var(--accent)",
											borderRadius: "2px",
										}}
									/>
									<span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
										R\u00e9el {selectedYear}
									</span>
								</div>
								<div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
									<div
										style={{
											width: "16px",
											height: "3px",
											background: "var(--warning)",
											borderRadius: "2px",
											opacity: 0.8,
										}}
									/>
									<span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
										Projet\u00e9 (moy. 3 derniers mois)
									</span>
								</div>
							</div>
						</div>
					</SectionCard>

					<div
						style={{
							display: "grid",
							gridTemplateColumns: "1fr 1fr",
							gap: "1.25rem",
						}}>
						{/* Projection calculation detail */}
						<SectionCard title="D\u00e9tail des projections">
							<div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
								{[
									{
										label: "Mois compl\u00e9t\u00e9s avec ventes",
										value: String(completedMonthsCount),
									},
									{
										label: "Moyenne mensuelle (mois actifs)",
										value: formatCurrency(monthlyAvgToDate),
									},
									{
										label: "Moyenne des 3 derniers mois",
										value: formatCurrency(recentAvg),
									},
									{
										label: "Mois restants dans l\u2019ann\u00e9e",
										value: String(remainingMonths),
									},
									{
										label: `CA ann\u00e9e pr\u00e9c\u00e9dente (${selectedYear - 1})`,
										value: prevTotalTTC > 0 ? formatCurrency(prevTotalTTC) : "\u2014",
									},
									{
										label: "Objectif si +10\u00a0% vs N-1",
										value:
											prevTotalTTC > 0
												? formatCurrency(prevTotalTTC * 1.1)
												: "\u2014",
										accent: true,
									},
								].map((item) => (
									<div
										key={item.label}
										style={{
											display: "flex",
											justifyContent: "space-between",
											padding: "0.5rem 0",
											borderBottom: "1px solid var(--border-color)",
											fontSize: "0.85rem",
										}}>
										<span>{item.label}</span>
										<span
											style={{
												fontWeight: 700,
												color:
													item.accent ? "var(--accent)" : undefined,
											}}>
											{item.value}
										</span>
									</div>
								))}
							</div>
						</SectionCard>

						{/* Month-by-month actual vs projected table */}
						<SectionCard title="Projection mois par mois" noPadding>
							<div style={{ overflowX: "auto" }}>
								<table className="data-table">
									<thead>
										<tr>
											<th>Mois</th>
											<th style={{ textAlign: "right" }}>R\u00e9el</th>
											<th style={{ textAlign: "right" }}>Projet\u00e9</th>
										</tr>
									</thead>
									<tbody>
										{monthRows.map((row, i) => {
											const isFuture =
												selectedYear === new Date().getFullYear() &&
												i > currentMonth;
											return (
												<tr key={i}>
													<td
														style={{
															fontWeight: 600,
															fontSize: "0.82rem",
															color: isFuture
																? "var(--text-muted)"
																: "var(--text)",
														}}>
														{MONTH_SHORT[i]}
														{isFuture && (
															<span
																style={{
																	fontSize: "0.68rem",
																	color: "var(--text-muted)",
																	marginLeft: "0.35rem",
																}}>
																(pr\u00e9vu)
															</span>
														)}
													</td>
													<td
														style={{
															textAlign: "right",
															fontSize: "0.82rem",
															fontWeight:
																!isFuture && row.grossTTC > 0 ? 700 : 400,
															color:
																!isFuture && row.grossTTC > 0
																	? "var(--accent)"
																	: "var(--text-muted)",
														}}>
														{!isFuture && row.grossTTC > 0
															? formatCurrency(row.grossTTC)
															: "\u2014"}
													</td>
													<td
														style={{
															textAlign: "right",
															fontSize: "0.82rem",
															fontStyle: isFuture ? "italic" : "normal",
															color: isFuture
																? "var(--warning)"
																: "var(--text-muted)",
														}}>
														{isFuture ? formatCurrency(recentAvg) : "\u2014"}
													</td>
												</tr>
											);
										})}
									</tbody>
									<tfoot>
										<tr style={{ borderTop: "2px solid var(--border-color)" }}>
											<td style={{ fontWeight: 700 }}>Estimation totale</td>
											<td
												style={{
													textAlign: "right",
													fontWeight: 700,
													color: "var(--accent)",
												}}>
												{formatCurrency(revenueToDate)}
											</td>
											<td
												style={{
													textAlign: "right",
													fontWeight: 700,
													color: "var(--warning)",
													fontStyle: "italic",
												}}>
												{formatCurrency(optimisticEstimate)}
											</td>
										</tr>
									</tfoot>
								</table>
							</div>
						</SectionCard>
					</div>

					{/* Disclaimer */}
					<div
						className="card"
						style={{
							display: "flex",
							alignItems: "center",
							gap: "0.75rem",
							fontSize: "0.82rem",
							color: "var(--text-muted)",
						}}>
						<svg
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2">
							<circle cx="12" cy="12" r="10" />
							<line x1="12" y1="16" x2="12" y2="12" />
							<line x1="12" y1="8" x2="12.01" y2="8" />
						</svg>
						<span>
							La projection tendance est calcul\u00e9e selon la formule\u00a0:
							<strong> moy. 3 derniers mois actifs \u00d7 mois restants + CA \u00e0 ce jour</strong>.
							Ces chiffres sont indicatifs et d\u00e9pendent de la constance des ventes.
						</span>
					</div>
				</div>
			)}

			{/* TAB: Export */}
			{tab === "export" && (
				<div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
					{/* Date range selection */}
					<SectionCard title="P\u00e9riode d\u2019export">
						<div
							style={{
								display: "flex",
								alignItems: "flex-end",
								gap: "1rem",
								flexWrap: "wrap",
							}}>
							<div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
								<label
									style={{
										fontSize: "0.78rem",
										fontWeight: 600,
										color: "var(--text-muted)",
									}}>
									Date de d\u00e9but
								</label>
								<input
									type="date"
									value={exportFrom}
									onChange={(e) => setExportFrom(e.target.value)}
									style={{
										padding: "0.55rem 0.85rem",
										border: "1.5px solid var(--border-color)",
										borderRadius: "8px",
										background: "var(--card-bg)",
										color: "var(--text)",
										fontSize: "0.875rem",
										fontFamily: "inherit",
									}}
								/>
							</div>
							<div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
								<label
									style={{
										fontSize: "0.78rem",
										fontWeight: 600,
										color: "var(--text-muted)",
									}}>
									Date de fin
								</label>
								<input
									type="date"
									value={exportTo}
									onChange={(e) => setExportTo(e.target.value)}
									style={{
										padding: "0.55rem 0.85rem",
										border: "1.5px solid var(--border-color)",
										borderRadius: "8px",
										background: "var(--card-bg)",
										color: "var(--text)",
										fontSize: "0.875rem",
										fontFamily: "inherit",
									}}
								/>
							</div>

							{/* Quick range presets */}
							<div style={{ display: "flex", gap: "0.5rem" }}>
								<button
									className="btn-secondary"
									style={{ fontSize: "0.82rem", padding: "0.55rem 0.85rem" }}
									onClick={() => {
										const y = selectedYear;
										setExportFrom(`${y}-01-01`);
										setExportTo(`${y}-12-31`);
									}}>
									Ann\u00e9e {selectedYear}
								</button>
								<button
									className="btn-secondary"
									style={{ fontSize: "0.82rem", padding: "0.55rem 0.85rem" }}
									onClick={() => {
										const now = new Date();
										const q = Math.floor(now.getMonth() / 3);
										const start = new Date(now.getFullYear(), q * 3, 1);
										const end = new Date(now.getFullYear(), q * 3 + 3, 0);
										setExportFrom(start.toISOString().slice(0, 10));
										setExportTo(end.toISOString().slice(0, 10));
									}}>
									Trimestre en cours
								</button>
								<button
									className="btn-secondary"
									style={{ fontSize: "0.82rem", padding: "0.55rem 0.85rem" }}
									onClick={() => {
										const now = new Date();
										const start = new Date(now.getFullYear(), now.getMonth(), 1);
										const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
										setExportFrom(start.toISOString().slice(0, 10));
										setExportTo(end.toISOString().slice(0, 10));
									}}>
									Mois en cours
								</button>
							</div>
						</div>

						{/* Period summary */}
						{exportFrom && exportTo && (
							<div
								style={{
									marginTop: "0.75rem",
									padding: "0.6rem 0.85rem",
									background: "var(--bg-alt)",
									borderRadius: "8px",
									fontSize: "0.82rem",
									color: "var(--text-muted)",
								}}>
								P\u00e9riode s\u00e9lectionn\u00e9e : <strong>{formatDate(exportFrom)}</strong> au{" "}
								<strong>{formatDate(exportTo)}</strong>
								{" \u2014 "}
								{
									completedYearSales.filter((s) => {
										const d = new Date(s.date).toISOString().slice(0, 10);
										return d >= exportFrom && d <= exportTo;
									}).length
								}{" "}
								vente(s) trouv\u00e9e(s)
							</div>
						)}
					</SectionCard>

					{/* Export format cards */}
					<div
						style={{
							display: "grid",
							gridTemplateColumns: "repeat(3,1fr)",
							gap: "1.25rem",
						}}>
						{/* CSV export with functional download */}
						<div
							className="card"
							style={{
								display: "flex",
								flexDirection: "column",
								alignItems: "center",
								justifyContent: "center",
								gap: "0.75rem",
								padding: "2rem 1.5rem",
								textAlign: "center",
							}}>
							<div
								style={{
									width: "48px",
									height: "48px",
									borderRadius: "12px",
									background: "rgba(34,197,94,0.12)",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
								}}>
								<svg
									width="22"
									height="22"
									viewBox="0 0 24 24"
									fill="none"
									stroke="var(--success)"
									strokeWidth="2">
									<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
									<polyline points="14 2 14 8 20 8" />
									<line x1="16" y1="13" x2="8" y2="13" />
									<line x1="16" y1="17" x2="8" y2="17" />
								</svg>
							</div>
							<div>
								<div
									style={{
										fontWeight: 700,
										fontSize: "0.92rem",
										marginBottom: "0.25rem",
									}}>
									Export CSV
								</div>
								<div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
									Tableur compatible Excel, Google Sheets
								</div>
							</div>
							<button
								className="btn-primary"
								style={{ fontSize: "0.82rem", padding: "0.5rem 1.25rem" }}
								onClick={() =>
									generateCsvExport(completedYearSales, exportFrom, exportTo)
								}>
								T\u00e9l\u00e9charger CSV
							</button>
						</div>

						{/* PDF export placeholder */}
						<div
							className="card"
							style={{
								display: "flex",
								flexDirection: "column",
								alignItems: "center",
								justifyContent: "center",
								gap: "0.75rem",
								padding: "2rem 1.5rem",
								textAlign: "center",
							}}>
							<div
								style={{
									width: "48px",
									height: "48px",
									borderRadius: "12px",
									background: "rgba(239,68,68,0.12)",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
								}}>
								<svg
									width="22"
									height="22"
									viewBox="0 0 24 24"
									fill="none"
									stroke="var(--danger)"
									strokeWidth="2">
									<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
									<polyline points="14 2 14 8 20 8" />
								</svg>
							</div>
							<div>
								<div
									style={{
										fontWeight: 700,
										fontSize: "0.92rem",
										marginBottom: "0.25rem",
									}}>
									Export PDF
								</div>
								<div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
									Rapport comptable format\u00e9 pour impression
								</div>
							</div>
							<button
								className="btn-primary"
								style={{ fontSize: "0.82rem", padding: "0.5rem 1.25rem" }}
								onClick={() => showToast("Export PDF bient\u00f4t disponible", "info")}>
								T\u00e9l\u00e9charger PDF
							</button>
						</div>

						{/* Excel export placeholder */}
						<div
							className="card"
							style={{
								display: "flex",
								flexDirection: "column",
								alignItems: "center",
								justifyContent: "center",
								gap: "0.75rem",
								padding: "2rem 1.5rem",
								textAlign: "center",
							}}>
							<div
								style={{
									width: "48px",
									height: "48px",
									borderRadius: "12px",
									background: "rgba(34,139,230,0.12)",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
								}}>
								<svg
									width="22"
									height="22"
									viewBox="0 0 24 24"
									fill="none"
									stroke="#228be6"
									strokeWidth="2">
									<rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
									<line x1="3" y1="9" x2="21" y2="9" />
									<line x1="3" y1="15" x2="21" y2="15" />
									<line x1="9" y1="3" x2="9" y2="21" />
									<line x1="15" y1="3" x2="15" y2="21" />
								</svg>
							</div>
							<div>
								<div
									style={{
										fontWeight: 700,
										fontSize: "0.92rem",
										marginBottom: "0.25rem",
									}}>
									Export Excel
								</div>
								<div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
									Fichier .xlsx avec onglets multiples
								</div>
							</div>
							<button
								className="btn-primary"
								style={{ fontSize: "0.82rem", padding: "0.5rem 1.25rem" }}
								onClick={() =>
									showToast("Export Excel bient\u00f4t disponible", "info")
								}>
								T\u00e9l\u00e9charger Excel
							</button>
						</div>
					</div>

					{/* Export column info */}
					<div
						className="card"
						style={{
							display: "flex",
							alignItems: "center",
							gap: "0.75rem",
							fontSize: "0.82rem",
							color: "var(--text-muted)",
						}}>
						<svg
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2">
							<circle cx="12" cy="12" r="10" />
							<line x1="12" y1="16" x2="12" y2="12" />
							<line x1="12" y1="8" x2="12.01" y2="8" />
						</svg>
						<span>
							Le CSV inclut\u00a0: Date, Produit, Vendeur, Plateforme, Quantit\u00e9,
							Prix unitaire HT, Prix unitaire TTC, Total HT, TVA, Total TTC, Statut.
							S\u00e9lectionnez une p\u00e9riode ci-dessus avant de t\u00e9l\u00e9charger.
						</span>
					</div>
				</div>
			)}

			{/* Global disclaimer */}
			<p
				style={{
					marginTop: "1.5rem",
					fontSize: "0.75rem",
					color: "var(--text-muted)",
					textAlign: "center",
				}}>
				Les montants H.T. sont calcul\u00e9s sur la base des prix enregistr\u00e9s. TVA{" "}
				{(TVA_RATE * 100).toFixed(0)}\u00a0%. Les ventes annul\u00e9es sont exclues du CA.
				Donn\u00e9es indicatives, ne remplacent pas un bilan certifi\u00e9.
			</p>

			{/* Floating tooltip for bar and line chart hover */}
			{tooltip && (
				<div
					style={{
						position: "fixed",
						left: tooltip.x + 16,
						top: tooltip.y - 20,
						background: "var(--sidebar-bg)",
						color: "#fff",
						padding: "0.6rem 0.9rem",
						borderRadius: "10px",
						boxShadow: "0 4px 20px rgba(0,0,0,0.35)",
						fontSize: "0.78rem",
						pointerEvents: "none",
						zIndex: 9999,
						minWidth: "190px",
					}}>
					<div
						style={{
							fontWeight: 700,
							marginBottom: "0.4rem",
							fontSize: "0.82rem",
							borderBottom: "1px solid rgba(255,255,255,0.15)",
							paddingBottom: "0.3rem",
						}}>
						{tooltip.data.label}
					</div>
					<div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
						<div>
							CA TTC\u00a0:{" "}
							<strong>{formatCurrency(tooltip.data.grossTTC)}</strong>
						</div>
						<div>
							CA HT\u00a0:{" "}
							<span style={{ color: "rgba(255,255,255,0.75)" }}>
								{formatCurrency(tooltip.data.grossHT)}
							</span>
						</div>
						<div>
							TVA\u00a0:{" "}
							<span style={{ color: "rgba(255,200,80,0.9)" }}>
								{formatCurrency(tooltip.data.tva)}
							</span>
						</div>
						<div>
							Factures\u00a0:{" "}
							<span style={{ color: "rgba(255,255,255,0.75)" }}>
								{tooltip.data.count}
							</span>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
