"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import api from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import type { Sale, Client, Task, Project, Product, User } from "@/types";
import {
	TaskStatusLabels,
	ProjectStatusLabels,
	ClientStatusLabels,
} from "@/types/constants";

// Period key type
type PeriodKey = "today" | "week" | "month" | "quarter" | "year" | "custom";

const PERIOD_LABELS: Record<PeriodKey, string> = {
	today: "Aujourd'hui",
	week: "Cette semaine",
	month: "Ce mois",
	quarter: "Ce trimestre",
	year: "Cette année",
	custom: "Personnalisé",
};

// Tooltip state shape
interface TooltipState {
	x: number;
	y: number;
	label: string;
	value: string;
}

// Stat modal state shape
interface StatModalState {
	type: string;
	title: string;
	items: unknown[];
}

// Bar chart data point
interface BarDataPoint {
	label: string;
	fullLabel: string;
	value: number;
}

// Generic ranking row
interface RankingRow {
	name: string;
	count: number;
	share: number;
}

// Donut segment shape
interface DonutSegment {
	label: string;
	count: number;
	color: string;
	percent: number;
}

// Day heatmap data point
interface DayPoint {
	day: number;
	value: number;
}

const DAY_NAMES_FR = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const DAY_NAMES_FULL_FR = [
	"Dimanche",
	"Lundi",
	"Mardi",
	"Mercredi",
	"Jeudi",
	"Vendredi",
	"Samedi",
];

/**
 * Format a number with French locale
 * @param n - Number to format
 * @returns Formatted string
 */
function formatNumber(n: number): string {
	return n.toLocaleString("fr-FR");
}

/**
 * Return the Monday-based start of the week for a date
 * @param d - Target date
 * @returns Monday of that week
 */
function startOfWeek(d: Date): Date {
	const day = d.getDay();
	const diff = d.getDate() - day + (day === 0 ? -6 : 1);
	return new Date(d.getFullYear(), d.getMonth(), diff);
}

/**
 * Return from/to Date range for a given period key
 * @param period - Period identifier
 * @returns Object with from and to dates
 */
function getPeriodRange(period: PeriodKey): { from: Date; to: Date } {
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const tomorrow = new Date(today);
	tomorrow.setDate(tomorrow.getDate() + 1);

	switch (period) {
		case "today":
			return { from: today, to: tomorrow };
		case "week": {
			const monday = startOfWeek(today);
			return { from: monday, to: tomorrow };
		}
		case "month":
			return {
				from: new Date(now.getFullYear(), now.getMonth(), 1),
				to: tomorrow,
			};
		case "quarter": {
			const q = Math.floor(now.getMonth() / 3);
			return {
				from: new Date(now.getFullYear(), q * 3, 1),
				to: tomorrow,
			};
		}
		case "year":
			return { from: new Date(now.getFullYear(), 0, 1), to: tomorrow };
		default:
			return {
				from: new Date(now.getFullYear(), now.getMonth(), 1),
				to: tomorrow,
			};
	}
}

/**
 * Collapsible section wrapper
 * @param title - Section heading
 * @param icon - Icon node
 * @param defaultOpen - Whether open by default
 * @param children - Section body
 * @param action - Optional action node in header
 * @returns Section element
 */
function Section({
	title,
	icon,
	defaultOpen = true,
	children,
	action,
}: {
	title: string;
	icon: React.ReactNode;
	defaultOpen?: boolean;
	children: React.ReactNode;
	action?: React.ReactNode;
}) {
	const [open, setOpen] = useState(defaultOpen);

	return (
		<div
			className="card"
			style={{ marginBottom: "1.25rem", padding: 0, overflow: "hidden" }}>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					padding: "0.85rem 1.15rem",
					borderBottom: open
						? "1px solid var(--border-color)"
						: "none",
					cursor: "pointer",
					userSelect: "none",
				}}
				onClick={() => setOpen(!open)}>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: "0.5rem",
					}}>
					{icon}
					<h3
						style={{
							margin: 0,
							fontSize: "0.92rem",
							fontWeight: 700,
						}}>
						{title}
					</h3>
				</div>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: "0.5rem",
					}}>
					{action && (
						<div onClick={(e) => e.stopPropagation()}>{action}</div>
					)}
					<svg
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="var(--text-muted)"
						strokeWidth="2"
						style={{
							transition: "transform 0.2s",
							transform: open ? "rotate(180deg)" : "rotate(0deg)",
						}}>
						<polyline points="6 9 12 15 18 9" />
					</svg>
				</div>
			</div>
			{open && <div style={{ padding: "1.15rem" }}>{children}</div>}
		</div>
	);
}

/**
 * Horizontal progress bar for rankings
 * @param percent - Fill percentage 0-100
 * @param color - Bar color
 * @returns Bar element
 */
function RankingBar({
	percent,
	color = "var(--accent)",
}: {
	percent: number;
	color?: string;
}) {
	return (
		<div
			style={{
				height: "6px",
				background: "var(--bg-alt)",
				borderRadius: "3px",
				overflow: "hidden",
				minWidth: "60px",
			}}>
			<div
				style={{
					height: "100%",
					width: `${Math.max(percent, 2)}%`,
					background: color,
					borderRadius: "3px",
					transition: "width 0.4s ease",
				}}
			/>
		</div>
	);
}

/**
 * Mini sparkline bar chart
 * @param values - Array of numeric values
 * @param color - Bar color
 * @returns Sparkline element
 */
function Sparkline({
	values,
	color = "var(--accent)",
}: {
	values: number[];
	color?: string;
}) {
	const max = Math.max(...values, 1);
	return (
		<div
			style={{
				display: "flex",
				alignItems: "flex-end",
				gap: "1px",
				height: "32px",
			}}>
			{values.map((v, i) => (
				<div
					key={i}
					style={{
						flex: 1,
						height: `${Math.max((v / max) * 100, 3)}%`,
						background: color,
						borderRadius: "1px",
						opacity: 0.7 + (i / values.length) * 0.3,
						minHeight: "2px",
					}}
				/>
			))}
		</div>
	);
}

/**
 * CSS bar chart with external fixed tooltip via callbacks
 * @param data - Array of bar data points
 * @param height - Chart rendering height in px
 * @param onBarEnter - Mouse enter callback with event and data
 * @param onBarLeave - Mouse leave callback
 * @returns Bar chart element
 */
function BarChart({
	data,
	height = 200,
	onBarEnter,
	onBarLeave,
}: {
	data: BarDataPoint[];
	height?: number;
	onBarEnter: (e: React.MouseEvent, label: string, value: string) => void;
	onBarLeave: () => void;
}) {
	const maxVal = Math.max(...data.map((d) => d.value), 1);
	const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

	const barGap = 2;
	const barMinWidth = 4;
	const barMaxWidth = 40;
	const totalBars = data.length;
	const computedWidth =
		totalBars > 0
			? Math.min(
					barMaxWidth,
					Math.max(barMinWidth, Math.floor(800 / totalBars) - barGap),
				)
			: 12;

	// Show every Nth label to prevent overlap
	const labelStep = totalBars > 30 ? 7 : totalBars > 14 ? 3 : 1;

	return (
		<div style={{ position: "relative" }}>
			{/* Y axis labels */}
			<div
				style={{
					position: "absolute",
					left: 0,
					top: 0,
					bottom: 24,
					width: "48px",
					display: "flex",
					flexDirection: "column",
					justifyContent: "space-between",
					pointerEvents: "none",
				}}>
				{[1, 0.75, 0.5, 0.25, 0].map((frac) => (
					<span
						key={frac}
						style={{
							fontSize: "0.68rem",
							color: "var(--text-muted)",
							textAlign: "right",
							paddingRight: "6px",
						}}>
						{maxVal * frac >= 1000
							? `${((maxVal * frac) / 1000).toFixed(0)}k`
							: (maxVal * frac).toFixed(0)}
					</span>
				))}
			</div>

			{/* Chart area */}
			<div
				style={{
					marginLeft: "52px",
					display: "flex",
					alignItems: "flex-end",
					gap: `${barGap}px`,
					height: `${height}px`,
					borderBottom: "1px solid var(--border-color)",
					position: "relative",
				}}>
				{/* Grid lines */}
				{[0.25, 0.5, 0.75, 1].map((frac) => (
					<div
						key={frac}
						style={{
							position: "absolute",
							left: 0,
							right: 0,
							bottom: `${frac * 100}%`,
							borderTop: "1px dashed var(--border-color)",
							opacity: 0.5,
							pointerEvents: "none",
						}}
					/>
				))}

				{data.map((d, i) => {
					const pct = maxVal > 0 ? (d.value / maxVal) * 100 : 0;
					return (
						<div
							key={i}
							style={{
								flex: `0 0 ${computedWidth}px`,
								display: "flex",
								flexDirection: "column",
								alignItems: "center",
								position: "relative",
								height: "100%",
								justifyContent: "flex-end",
							}}
							onMouseEnter={(e) => {
								setHoveredIdx(i);
								onBarEnter(
									e,
									d.fullLabel,
									formatNumber(d.value),
								);
							}}
							onMouseLeave={() => {
								setHoveredIdx(null);
								onBarLeave();
							}}>
							{/* Bar */}
							<div
								style={{
									width: "100%",
									height: `${Math.max(pct, 0.5)}%`,
									background:
										hoveredIdx === i
											? "var(--accent)"
											: d.value > 0
												? "rgba(184, 146, 58, 0.75)"
												: "rgba(184, 146, 58, 0.15)",
									borderRadius: "3px 3px 0 0",
									transition:
										"height 0.3s ease, background 0.15s",
									minHeight: "2px",
									cursor: "pointer",
								}}
							/>
						</div>
					);
				})}
			</div>

			{/* X axis labels */}
			<div
				style={{
					marginLeft: "52px",
					display: "flex",
					gap: `${barGap}px`,
					marginTop: "4px",
				}}>
				{data.map((d, i) => (
					<div
						key={i}
						style={{
							flex: `0 0 ${computedWidth}px`,
							fontSize: "0.6rem",
							color: "var(--text-muted)",
							textAlign: "center",
							overflow: "hidden",
						}}>
						{i % labelStep === 0 ? d.label : ""}
					</div>
				))}
			</div>
		</div>
	);
}

/**
 * Donut chart from segments
 * @param segments - Array of donut segments
 * @param centerLabel - Label below total number
 * @returns Donut chart element
 */
function DonutChart({
	segments,
	centerLabel = "total",
}: {
	segments: DonutSegment[];
	centerLabel?: string;
}) {
	const total = segments.reduce((s, seg) => s + seg.count, 0);

	if (total === 0) {
		return (
			<div
				style={{
					textAlign: "center",
					color: "var(--text-muted)",
					padding: "2rem",
					fontSize: "0.85rem",
				}}>
				Aucune donnée
			</div>
		);
	}

	// Build conic-gradient string
	let accumulated = 0;
	const gradientParts: string[] = [];
	for (const seg of segments) {
		const pct = (seg.count / total) * 100;
		gradientParts.push(
			`${seg.color} ${accumulated}% ${accumulated + pct}%`,
		);
		accumulated += pct;
	}

	return (
		<div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
			{/* Donut ring */}
			<div
				style={{
					width: "140px",
					height: "140px",
					borderRadius: "50%",
					background: `conic-gradient(${gradientParts.join(", ")})`,
					position: "relative",
					flexShrink: 0,
				}}>
				{/* Inner hole */}
				<div
					style={{
						position: "absolute",
						inset: "30%",
						borderRadius: "50%",
						background: "var(--card-bg)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						flexDirection: "column",
					}}>
					<div
						style={{
							fontSize: "1.1rem",
							fontWeight: 700,
							color: "var(--text)",
						}}>
						{total}
					</div>
					<div
						style={{
							fontSize: "0.6rem",
							color: "var(--text-muted)",
						}}>
						{centerLabel}
					</div>
				</div>
			</div>

			{/* Legend */}
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "0.6rem",
				}}>
				{segments.map((seg) => (
					<div
						key={seg.label}
						style={{
							display: "flex",
							alignItems: "center",
							gap: "0.5rem",
						}}>
						<div
							style={{
								width: "10px",
								height: "10px",
								borderRadius: "2px",
								background: seg.color,
								flexShrink: 0,
							}}
						/>
						<div>
							<div
								style={{
									fontSize: "0.8rem",
									fontWeight: 600,
									color: "var(--text)",
								}}>
								{seg.label}
							</div>
							<div
								style={{
									fontSize: "0.7rem",
									color: "var(--text-muted)",
								}}>
								{seg.count} &middot; {seg.percent.toFixed(1)}
								&nbsp;%
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

/**
 * Day-of-week heatmap row
 * @param data - Array of day data points
 * @param label - Row label
 * @returns Heatmap element
 */
function DayHeatmap({ data, label }: { data: DayPoint[]; label: string }) {
	const max = Math.max(...data.map((d) => d.value), 1);

	return (
		<div>
			<div
				style={{
					fontSize: "0.75rem",
					fontWeight: 600,
					marginBottom: "0.5rem",
					color: "var(--text)",
				}}>
				{label}
			</div>
			<div style={{ display: "flex", gap: "0.35rem" }}>
				{data.map((d) => {
					const intensity = d.value / max;
					return (
						<div
							key={d.day}
							style={{ flex: 1, textAlign: "center" }}>
							<div
								style={{
									height: "36px",
									borderRadius: "6px",
									background:
										intensity > 0
											? `rgba(184, 146, 58, ${0.15 + intensity * 0.75})`
											: "var(--bg-alt)",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									fontSize: "0.72rem",
									fontWeight: intensity > 0.5 ? 700 : 400,
									color:
										intensity > 0.5
											? "#fff"
											: "var(--text)",
									transition: "background 0.3s",
								}}>
								{d.value > 0 ? d.value : ""}
							</div>
							<div
								style={{
									fontSize: "0.62rem",
									color: "var(--text-muted)",
									marginTop: "2px",
								}}>
								{DAY_NAMES_FR[d.day]}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}

/**
 * Clickable stat card that opens a detail modal
 * @param label - Card label
 * @param value - Main value to display
 * @param sub - Subtitle text
 * @param color - Left border accent color
 * @param onClick - Click handler
 * @returns Stat card element
 */
function StatCard({
	label,
	value,
	sub,
	color,
	onClick,
}: {
	label: string;
	value: string | number;
	sub: string;
	color?: string;
	onClick?: () => void;
}) {
	return (
		<div
			className="stat-card"
			style={{
				cursor: onClick ? "pointer" : "default",
				transition: "all 0.2s",
				borderLeft: color ? `3px solid ${color}` : undefined,
			}}
			onClick={onClick}>
			<div className="stat-info">
				<div className="stat-value" style={{ fontSize: "1.1rem" }}>
					{value}
				</div>
				<div className="stat-label">{label}</div>
				<div
					style={{
						fontSize: "0.72rem",
						color: "var(--text-muted)",
						marginTop: "0.15rem",
					}}>
					{sub}
				</div>
			</div>
			{onClick && (
				<div style={{ position: "absolute", top: "8px", right: "8px" }}>
					<svg
						width="12"
						height="12"
						viewBox="0 0 24 24"
						fill="none"
						stroke="var(--text-muted)"
						strokeWidth="2">
						<polyline points="9 18 15 12 9 6" />
					</svg>
				</div>
			)}
		</div>
	);
}

/**
 * Generic ranking list section
 * @param rows - Ranking rows
 * @param maxCount - Maximum count for bar scaling
 * @param barColor - Bar fill color
 * @param renderRight - Render function for right column
 * @returns Ranking list element
 */
function RankingList({
	rows,
	maxCount,
	barColor = "var(--accent)",
	renderRight,
}: {
	rows: RankingRow[];
	maxCount: number;
	barColor?: string;
	renderRight?: (row: RankingRow) => React.ReactNode;
}) {
	if (rows.length === 0) {
		return (
			<div
				style={{
					textAlign: "center",
					color: "var(--text-muted)",
					fontSize: "0.82rem",
					padding: "1rem",
				}}>
				Aucune donnée
			</div>
		);
	}

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "0.75rem",
			}}>
			{rows.slice(0, 8).map((row, idx) => (
				<div key={row.name}>
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							marginBottom: "3px",
						}}>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: "0.4rem",
							}}>
							<span
								style={{
									width: "18px",
									height: "18px",
									borderRadius: "4px",
									background:
										idx < 3
											? "var(--accent)"
											: "var(--bg-alt)",
									color:
										idx < 3 ? "#fff" : "var(--text-muted)",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									fontSize: "0.65rem",
									fontWeight: 700,
									flexShrink: 0,
								}}>
								{idx + 1}
							</span>
							<span
								style={{
									fontSize: "0.8rem",
									fontWeight: 600,
									color: "var(--text)",
									maxWidth: "140px",
									overflow: "hidden",
									textOverflow: "ellipsis",
									whiteSpace: "nowrap",
								}}>
								{row.name}
							</span>
						</div>
						<div style={{ textAlign: "right" }}>
							{renderRight ? (
								renderRight(row)
							) : (
								<>
									<div
										style={{
											fontSize: "0.78rem",
											fontWeight: 700,
										}}>
										{formatNumber(row.count)}
									</div>
									<div
										style={{
											fontSize: "0.65rem",
											color: "var(--text-muted)",
										}}>
										{row.share.toFixed(1)}&nbsp;%
									</div>
								</>
							)}
						</div>
					</div>
					<RankingBar
						percent={(row.count / Math.max(maxCount, 1)) * 100}
						color={barColor}
					/>
				</div>
			))}
		</div>
	);
}

/**
 * Modal overlay with title and close button
 * @param title - Modal heading
 * @param onClose - Close callback
 * @param children - Modal body content
 * @returns Modal element
 */
function Modal({
	title,
	onClose,
	children,
}: {
	title: string;
	onClose: () => void;
	children: React.ReactNode;
}) {
	return (
		<div
			className="modal-overlay"
			onClick={onClose}
			style={{
				position: "fixed",
				inset: 0,
				background: "rgba(0,0,0,0.55)",
				zIndex: 1000,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
			}}>
			<div
				className="modal-content"
				onClick={(e) => e.stopPropagation()}
				style={{
					background: "var(--card-bg)",
					borderRadius: "12px",
					padding: "1.5rem",
					minWidth: "340px",
					maxWidth: "600px",
					width: "90%",
					maxHeight: "80vh",
					overflow: "auto",
					boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
				}}>
				{/* Modal header */}
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						marginBottom: "1.25rem",
					}}>
					<h3
						style={{
							margin: 0,
							fontSize: "1rem",
							fontWeight: 700,
						}}>
						{title}
					</h3>
					<button
						onClick={onClose}
						style={{
							background: "none",
							border: "none",
							cursor: "pointer",
							color: "var(--text-muted)",
							padding: "4px",
						}}>
						<svg
							width="18"
							height="18"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2">
							<line x1="18" y1="6" x2="6" y2="18" />
							<line x1="6" y1="6" x2="18" y2="18" />
						</svg>
					</button>
				</div>
				{children}
			</div>
		</div>
	);
}

// ════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ════════════════════════════════════════════

export default function AnalyticsPage() {
	const { user } = useAuth();
	const { showToast } = useToast();

	// Data state
	const [allSales, setAllSales] = useState<Sale[]>([]);
	const [allClients, setAllClients] = useState<Client[]>([]);
	const [allTasks, setAllTasks] = useState<Task[]>([]);
	const [allProjects, setAllProjects] = useState<Project[]>([]);
	const [allProducts, setAllProducts] = useState<Product[]>([]);
	const [allUsers, setAllUsers] = useState<User[]>([]);
	const [loading, setLoading] = useState(true);

	// Period selector
	const [period, setPeriod] = useState<PeriodKey>("month");
	const [customFrom, setCustomFrom] = useState("");
	const [customTo, setCustomTo] = useState("");

	// Fixed tooltip for chart hover
	const [tooltip, setTooltip] = useState<TooltipState | null>(null);

	// Stat card modal
	const [statModal, setStatModal] = useState<StatModalState | null>(null);

	/**
	 * Load all analytics data from API
	 * @returns Promise resolving when all data is loaded
	 */
	const load = useCallback(async () => {
		setLoading(true);
		try {
			// Parallel fetch of all required datasets
			const [
				salesData,
				clientsData,
				tasksData,
				projectsData,
				productsData,
				usersData,
			] = await Promise.all([
				api.get<{ sales: Sale[] }>("/sales?limit=5000"),
				api.get<{ clients: Client[] }>("/clients?limit=5000"),
				api.get<{ tasks: Task[] }>("/tasks?limit=5000"),
				api.get<{ projects: Project[] }>("/projects?limit=1000"),
				api.get<{ products: Product[] }>("/products?limit=1000"),
				api.get<{ users: User[] }>("/users?limit=500"),
			]);
			setAllSales(salesData.sales);
			setAllClients(clientsData.clients);
			setAllTasks(tasksData.tasks);
			setAllProjects(projectsData.projects);
			setAllProducts(productsData.products);
			setAllUsers(usersData.users);
		} catch {
			showToast("Erreur de chargement", "error");
		} finally {
			setLoading(false);
		}
	}, [showToast]);

	useEffect(() => {
		load();
	}, [load]);

	// Period date range
	const { from: periodFrom, to: periodTo } = useMemo(() => {
		if (period === "custom" && customFrom && customTo) {
			return {
				from: new Date(customFrom),
				to: new Date(customTo + "T23:59:59"),
			};
		}
		return getPeriodRange(period);
	}, [period, customFrom, customTo]);

	// Sales filtered by period
	const sales = useMemo(
		() =>
			allSales.filter((s) => {
				const d = new Date(s.date);
				return d >= periodFrom && d < periodTo;
			}),
		[allSales, periodFrom, periodTo],
	);

	const completedSales = useMemo(
		() => sales.filter((s) => s.status === "completed"),
		[sales],
	);
	const cancelledSales = useMemo(
		() => sales.filter((s) => s.status === "cancelled"),
		[sales],
	);
	const postponedSales = useMemo(
		() => sales.filter((s) => s.status === "postponed"),
		[sales],
	);

	// Clients created in period
	const newClients = useMemo(
		() =>
			allClients.filter((c) => {
				const d = new Date(c.createdAt);
				return d >= periodFrom && d < periodTo;
			}),
		[allClients, periodFrom, periodTo],
	);

	// Active tasks
	const activeTasks = useMemo(
		() =>
			allTasks.filter(
				(t) => t.status === "en_cours" || t.status === "en_attente",
			),
		[allTasks],
	);
	const overdueTasks = useMemo(
		() =>
			allTasks.filter((t) => {
				if (!t.dueDate || t.completed || t.cancelled) return false;
				return new Date(t.dueDate) < new Date();
			}),
		[allTasks],
	);
	const completedTasksPeriod = useMemo(
		() =>
			allTasks.filter((t) => {
				if (!t.completed) return false;
				const d = new Date(t.createdAt);
				return d >= periodFrom && d < periodTo;
			}),
		[allTasks, periodFrom, periodTo],
	);

	// Active projects
	const activeProjects = useMemo(
		() => allProjects.filter((p) => p.status === "active"),
		[allProjects],
	);

	// Products near stock alert
	const alertProducts = useMemo(() => {
		return allProducts.filter((p) => {
			const totalStock =
				p.stocks?.reduce((s, st) => s + st.quantity, 0) ?? 0;
			return totalStock <= p.alertThreshold;
		});
	}, [allProducts]);

	// Sales per seller ranking
	const sellerRanking = useMemo((): RankingRow[] => {
		const map = new Map<string, { name: string; count: number }>();
		for (const s of sales) {
			const name = s.seller?.name || `Vendeur #${s.sellerId}`;
			const ex = map.get(name);
			if (ex) ex.count += 1;
			else map.set(name, { name, count: 1 });
		}
		const total = sales.length || 1;
		return Array.from(map.values())
			.map((r) => ({ ...r, share: (r.count / total) * 100 }))
			.sort((a, b) => b.count - a.count);
	}, [sales]);

	// Sales per platform ranking
	const platformRanking = useMemo((): RankingRow[] => {
		const map = new Map<string, number>();
		for (const s of sales) {
			const plat = s.platform || "Direct";
			map.set(plat, (map.get(plat) ?? 0) + 1);
		}
		const total = sales.length || 1;
		return Array.from(map.entries())
			.map(([name, count]) => ({
				name,
				count,
				share: (count / total) * 100,
			}))
			.sort((a, b) => b.count - a.count);
	}, [sales]);

	// Most sold products ranking (by count)
	const productRanking = useMemo((): RankingRow[] => {
		const map = new Map<string, { name: string; count: number }>();
		for (const s of completedSales) {
			const name = s.product?.name || `Produit #${s.productId}`;
			const ex = map.get(name);
			if (ex) ex.count += s.quantity;
			else map.set(name, { name, count: s.quantity });
		}
		const totalUnits =
			completedSales.reduce((sum, s) => sum + s.quantity, 0) || 1;
		return Array.from(map.values())
			.map((r) => ({ ...r, share: (r.count / totalUnits) * 100 }))
			.sort((a, b) => b.count - a.count);
	}, [completedSales]);

	// Sales count per day/week/month chart data
	const salesChartData = useMemo((): BarDataPoint[] => {
		const daysInPeriod = Math.max(
			1,
			Math.ceil((periodTo.getTime() - periodFrom.getTime()) / 86400000),
		);

		const dailyMap = new Map<string, number>();
		for (let i = 0; i < daysInPeriod; i++) {
			const d = new Date(periodFrom.getTime() + i * 86400000);
			dailyMap.set(d.toISOString().slice(0, 10), 0);
		}
		for (const s of sales) {
			const key = new Date(s.date).toISOString().slice(0, 10);
			if (dailyMap.has(key))
				dailyMap.set(key, (dailyMap.get(key) ?? 0) + 1);
		}

		if (daysInPeriod > 90) {
			const monthMap = new Map<string, number>();
			dailyMap.forEach((count, date) => {
				const key = date.slice(0, 7);
				monthMap.set(key, (monthMap.get(key) ?? 0) + count);
			});
			return Array.from(monthMap.entries()).map(([m, value]) => {
				const [y, mo] = m.split("-");
				return {
					label: `${mo}/${y.slice(2)}`,
					fullLabel: new Date(
						Number(y),
						Number(mo) - 1,
						1,
					).toLocaleDateString("fr-FR", {
						month: "long",
						year: "numeric",
					}),
					value,
				};
			});
		}

		if (daysInPeriod > 31) {
			const weekMap = new Map<string, number>();
			dailyMap.forEach((count, date) => {
				const ws = startOfWeek(new Date(date));
				const key = ws.toISOString().slice(0, 10);
				weekMap.set(key, (weekMap.get(key) ?? 0) + count);
			});
			return Array.from(weekMap.entries())
				.sort(([a], [b]) => a.localeCompare(b))
				.map(([date, value]) => ({
					label: new Date(date).toLocaleDateString("fr-FR", {
						day: "2-digit",
						month: "2-digit",
					}),
					fullLabel: `Semaine du ${new Date(date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}`,
					value,
				}));
		}

		return Array.from(dailyMap.entries()).map(([date, value]) => ({
			label: new Date(date).toLocaleDateString("fr-FR", {
				day: "2-digit",
				month: "2-digit",
			}),
			fullLabel: new Date(date).toLocaleDateString("fr-FR", {
				weekday: "long",
				day: "numeric",
				month: "long",
			}),
			value,
		}));
	}, [sales, periodFrom, periodTo]);

	// New clients per month over last 6 months
	const clientsMonthlyData = useMemo((): BarDataPoint[] => {
		const now = new Date();
		return Array.from({ length: 6 }, (_, i) => {
			const monthDate = new Date(
				now.getFullYear(),
				now.getMonth() - (5 - i),
				1,
			);
			const nextMonth = new Date(
				now.getFullYear(),
				now.getMonth() - (5 - i) + 1,
				1,
			);
			const count = allClients.filter((c) => {
				const d = new Date(c.createdAt);
				return d >= monthDate && d < nextMonth;
			}).length;
			return {
				label: monthDate.toLocaleDateString("fr-FR", {
					month: "short",
				}),
				fullLabel: monthDate.toLocaleDateString("fr-FR", {
					month: "long",
					year: "numeric",
				}),
				value: count,
			};
		});
	}, [allClients]);

	// Tasks per user ranking
	const tasksByUser = useMemo((): RankingRow[] => {
		const map = new Map<string, number>();
		for (const t of allTasks) {
			if (!t.assignee) continue;
			const name = t.assignee.name;
			map.set(name, (map.get(name) ?? 0) + 1);
		}
		const maxCount = Math.max(...Array.from(map.values()), 1);
		return Array.from(map.entries())
			.map(([name, count]) => ({
				name,
				count,
				share: (count / maxCount) * 100,
			}))
			.sort((a, b) => b.count - a.count);
	}, [allTasks]);

	// Completed tasks per user in period
	const completedTasksByUser = useMemo((): RankingRow[] => {
		const map = new Map<string, number>();
		for (const t of completedTasksPeriod) {
			if (!t.assignee) continue;
			const name = t.assignee.name;
			map.set(name, (map.get(name) ?? 0) + 1);
		}
		const maxCount = Math.max(...Array.from(map.values()), 1);
		return Array.from(map.entries())
			.map(([name, count]) => ({
				name,
				count,
				share: (count / maxCount) * 100,
			}))
			.sort((a, b) => b.count - a.count);
	}, [completedTasksPeriod]);

	// Task status distribution
	const taskStatusSegments = useMemo((): DonutSegment[] => {
		const total = allTasks.length || 1;
		const STATUS_COLORS: Record<string, string> = {
			en_cours: "var(--accent)",
			bloquee: "var(--danger)",
			realisee: "var(--success)",
			annulee: "#6b7280",
			en_attente: "#8b5cf6",
		};
		const map = new Map<string, number>();
		for (const t of allTasks) {
			map.set(t.status, (map.get(t.status) ?? 0) + 1);
		}
		return Array.from(map.entries()).map(([status, count]) => ({
			label: TaskStatusLabels[status] ?? status,
			count,
			color: STATUS_COLORS[status] ?? "#9ca3af",
			percent: (count / total) * 100,
		}));
	}, [allTasks]);

	// Project status distribution
	const projectStatusSegments = useMemo((): DonutSegment[] => {
		const total = allProjects.length || 1;
		const STATUS_COLORS: Record<string, string> = {
			active: "var(--success)",
			paused: "var(--warning)",
			completed: "var(--accent)",
			cancelled: "var(--danger)",
		};
		const map = new Map<string, number>();
		for (const p of allProjects) {
			map.set(p.status, (map.get(p.status) ?? 0) + 1);
		}
		return Array.from(map.entries()).map(([status, count]) => ({
			label: ProjectStatusLabels[status] ?? status,
			count,
			color: STATUS_COLORS[status] ?? "#9ca3af",
			percent: (count / total) * 100,
		}));
	}, [allProjects]);

	// Client status distribution
	const clientStatusSegments = useMemo((): DonutSegment[] => {
		const total = allClients.length || 1;
		const STATUS_COLORS: Record<string, string> = {
			"one-shot": "#8b5cf6",
			récurrent: "var(--accent)",
			permanent: "var(--success)",
			inactif: "#6b7280",
		};
		const map = new Map<string, number>();
		for (const c of allClients) {
			map.set(c.status, (map.get(c.status) ?? 0) + 1);
		}
		return Array.from(map.entries()).map(([status, count]) => ({
			label: ClientStatusLabels[status] ?? status,
			count,
			color: STATUS_COLORS[status] ?? "#9ca3af",
			percent: (count / total) * 100,
		}));
	}, [allClients]);

	// Day of week distribution for sales
	const dayOfWeekData = useMemo((): DayPoint[] => {
		const counts = new Array(7).fill(0);
		for (const s of sales) counts[new Date(s.date).getDay()] += 1;
		return counts.map((value, day) => ({ day, value }));
	}, [sales]);

	// Sales status donut segments
	const saleStatusSegments = useMemo((): DonutSegment[] => {
		const total = sales.length || 1;
		return [
			{
				label: "Complétées",
				count: completedSales.length,
				color: "var(--success)",
				percent: (completedSales.length / total) * 100,
			},
			{
				label: "Reportées",
				count: postponedSales.length,
				color: "var(--warning)",
				percent: (postponedSales.length / total) * 100,
			},
			{
				label: "Annulées",
				count: cancelledSales.length,
				color: "var(--danger)",
				percent: (cancelledSales.length / total) * 100,
			},
		];
	}, [sales, completedSales, cancelledSales, postponedSales]);

	// Sales conversion rate
	const conversionRate =
		sales.length > 0 ? (completedSales.length / sales.length) * 100 : 0;

	// Busiest day
	const busiestDayIdx = dayOfWeekData.reduce(
		(best, d) => (d.value > dayOfWeekData[best].value ? d.day : best),
		0,
	);

	/**
	 * Open stat modal with pre-configured data
	 * @param type - Modal type identifier
	 * @param title - Modal heading
	 * @param items - Items to display in modal
	 */
	function openModal(type: string, title: string, items: unknown[]) {
		setStatModal({ type, title, items });
	}

	/**
	 * Render modal body content based on modal type
	 * @param modal - Current stat modal state
	 * @returns Modal content element
	 */
	function renderModalContent(modal: StatModalState) {
		if (modal.type === "sales") {
			const saleItems = modal.items as Sale[];
			return (
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "0.5rem",
					}}>
					{saleItems.length === 0 && (
						<div
							style={{
								color: "var(--text-muted)",
								fontSize: "0.85rem",
								textAlign: "center",
								padding: "1rem",
							}}>
							Aucune vente
						</div>
					)}
					{saleItems.map((s) => (
						<div
							key={s.id}
							style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
								padding: "0.6rem 0.75rem",
								background: "var(--bg-alt)",
								borderRadius: "8px",
							}}>
							<div>
								<div
									style={{
										fontSize: "0.82rem",
										fontWeight: 600,
									}}>
									{s.product?.name ??
										`Produit #${s.productId}`}
								</div>
								<div
									style={{
										fontSize: "0.72rem",
										color: "var(--text-muted)",
									}}>
									{s.client?.name ?? "Client inconnu"}{" "}
									&middot; {s.seller?.name ?? "—"}
								</div>
							</div>
							<div style={{ textAlign: "right" }}>
								<div
									style={{
										fontSize: "0.82rem",
										fontWeight: 700,
									}}>
									{s.quantity} unité(s)
								</div>
								<span
									className={`badge badge-${s.status === "completed" ? "success" : s.status === "cancelled" ? "danger" : "warning"}`}
									style={{ fontSize: "0.65rem" }}>
									{s.status === "completed"
										? "Complétée"
										: s.status === "cancelled"
											? "Annulée"
											: "Reportée"}
								</span>
							</div>
						</div>
					))}
				</div>
			);
		}

		if (modal.type === "tasks_active" || modal.type === "tasks_overdue") {
			const taskItems = modal.items as Task[];
			return (
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "0.5rem",
					}}>
					{taskItems.length === 0 && (
						<div
							style={{
								color: "var(--text-muted)",
								fontSize: "0.85rem",
								textAlign: "center",
								padding: "1rem",
							}}>
							Aucune tâche
						</div>
					)}
					{taskItems.map((t) => (
						<div
							key={t.id}
							style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
								padding: "0.6rem 0.75rem",
								background: "var(--bg-alt)",
								borderRadius: "8px",
							}}>
							<div>
								<div
									style={{
										fontSize: "0.82rem",
										fontWeight: 600,
									}}>
									{t.title}
								</div>
								<div
									style={{
										fontSize: "0.72rem",
										color: "var(--text-muted)",
									}}>
									{t.assignee?.name ?? "Non assignée"}
									{t.dueDate &&
										` · Échéance : ${new Date(t.dueDate).toLocaleDateString("fr-FR")}`}
								</div>
							</div>
							<span
								className={`badge badge-${t.status === "en_cours" ? "warning" : t.status === "bloquee" ? "danger" : "light"}`}
								style={{ fontSize: "0.65rem" }}>
								{TaskStatusLabels[t.status] ?? t.status}
							</span>
						</div>
					))}
				</div>
			);
		}

		if (modal.type === "projects_active") {
			const projItems = modal.items as Project[];
			return (
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "0.5rem",
					}}>
					{projItems.length === 0 && (
						<div
							style={{
								color: "var(--text-muted)",
								fontSize: "0.85rem",
								textAlign: "center",
								padding: "1rem",
							}}>
							Aucun projet
						</div>
					)}
					{projItems.map((p) => {
						const total = p.taskCount ?? 0;
						const done = p.completedTaskCount ?? 0;
						const pct =
							total > 0 ? Math.round((done / total) * 100) : 0;
						return (
							<div
								key={p.id}
								style={{
									padding: "0.6rem 0.75rem",
									background: "var(--bg-alt)",
									borderRadius: "8px",
								}}>
								<div
									style={{
										display: "flex",
										justifyContent: "space-between",
										marginBottom: "4px",
									}}>
									<div
										style={{
											fontSize: "0.82rem",
											fontWeight: 600,
										}}>
										{p.emoji && `${p.emoji} `}
										{p.name}
									</div>
									<span
										style={{
											fontSize: "0.72rem",
											fontWeight: 700,
											color: "var(--accent)",
										}}>
										{pct}%
									</span>
								</div>
								<RankingBar
									percent={pct}
									color="var(--accent)"
								/>
								<div
									style={{
										fontSize: "0.68rem",
										color: "var(--text-muted)",
										marginTop: "4px",
									}}>
									{done}/{total} tâches
								</div>
							</div>
						);
					})}
				</div>
			);
		}

		if (modal.type === "clients_new") {
			const clientItems = modal.items as Client[];
			return (
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "0.5rem",
					}}>
					{clientItems.length === 0 && (
						<div
							style={{
								color: "var(--text-muted)",
								fontSize: "0.85rem",
								textAlign: "center",
								padding: "1rem",
							}}>
							Aucun nouveau client
						</div>
					)}
					{clientItems.map((c) => (
						<div
							key={c.id}
							style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
								padding: "0.6rem 0.75rem",
								background: "var(--bg-alt)",
								borderRadius: "8px",
							}}>
							<div>
								<div
									style={{
										fontSize: "0.82rem",
										fontWeight: 600,
									}}>
									{c.name}
								</div>
								<div
									style={{
										fontSize: "0.72rem",
										color: "var(--text-muted)",
									}}>
									{c.company ?? c.email ?? "—"}
								</div>
							</div>
							<span
								className={`badge badge-light`}
								style={{ fontSize: "0.65rem" }}>
								{ClientStatusLabels[c.status] ?? c.status}
							</span>
						</div>
					))}
				</div>
			);
		}

		if (modal.type === "products_alert") {
			const prodItems = modal.items as (Product & {
				totalStock: number;
			})[];
			return (
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "0.5rem",
					}}>
					{prodItems.length === 0 && (
						<div
							style={{
								color: "var(--text-muted)",
								fontSize: "0.85rem",
								textAlign: "center",
								padding: "1rem",
							}}>
							Aucun produit en alerte
						</div>
					)}
					{prodItems.map((p) => (
						<div
							key={p.id}
							style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
								padding: "0.6rem 0.75rem",
								background: "var(--bg-alt)",
								borderRadius: "8px",
							}}>
							<div>
								<div
									style={{
										fontSize: "0.82rem",
										fontWeight: 600,
									}}>
									{p.name}
								</div>
								<div
									style={{
										fontSize: "0.72rem",
										color: "var(--text-muted)",
									}}>
									Seuil : {p.alertThreshold}
								</div>
							</div>
							<div style={{ textAlign: "right" }}>
								<div
									style={{
										fontSize: "0.82rem",
										fontWeight: 700,
										color:
											p.totalStock === 0
												? "var(--danger)"
												: "var(--warning)",
									}}>
									{p.totalStock} en stock
								</div>
							</div>
						</div>
					))}
				</div>
			);
		}

		return null;
	}

	// ════════════════════════════
	// RENDER
	// ════════════════════════════

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
							<polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
						</svg>
					</div>
					<div className="phb-text">
						<h1>Analytiques</h1>
						<p className="page-description">
							Performance opérationnelle et activité
						</p>
					</div>
				</div>

				<div
					className="page-header-box-actions"
					style={{
						display: "flex",
						gap: "0.5rem",
						alignItems: "center",
					}}>
					{/* Period selector */}
					<div
						style={{
							display: "flex",
							gap: "0.25rem",
							background: "var(--bg-alt)",
							borderRadius: "10px",
							padding: "0.25rem",
							flexWrap: "wrap",
						}}>
						{(Object.keys(PERIOD_LABELS) as PeriodKey[]).map(
							(key) => (
								<button
									key={key}
									onClick={() => setPeriod(key)}
									style={{
										padding: "0.38rem 0.7rem",
										borderRadius: "7px",
										border: "none",
										background:
											period === key
												? "var(--card-bg)"
												: "transparent",
										color:
											period === key
												? "var(--accent)"
												: "var(--text-muted)",
										fontWeight: period === key ? 700 : 400,
										fontSize: "0.78rem",
										cursor: "pointer",
										boxShadow:
											period === key
												? "0 1px 4px rgba(0,0,0,0.08)"
												: "none",
										transition: "all 0.15s",
										whiteSpace: "nowrap",
									}}>
									{PERIOD_LABELS[key]}
								</button>
							),
						)}
					</div>
				</div>
			</div>

			{/* Custom date picker */}
			{period === "custom" && (
				<div
					className="card"
					style={{
						marginBottom: "1rem",
						display: "flex",
						alignItems: "center",
						gap: "1rem",
						padding: "0.75rem 1.15rem",
					}}>
					<span
						style={{
							fontSize: "0.82rem",
							fontWeight: 600,
							color: "var(--text)",
						}}>
						Période personnalisée :
					</span>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: "0.5rem",
						}}>
						<label
							style={{
								fontSize: "0.78rem",
								color: "var(--text-muted)",
							}}>
							Du
						</label>
						<input
							type="date"
							value={customFrom}
							onChange={(e) => setCustomFrom(e.target.value)}
							style={{
								padding: "0.35rem 0.55rem",
								borderRadius: "6px",
								border: "1px solid var(--border-color)",
								background: "var(--bg-alt)",
								color: "var(--text)",
								fontSize: "0.8rem",
							}}
						/>
						<label
							style={{
								fontSize: "0.78rem",
								color: "var(--text-muted)",
							}}>
							au
						</label>
						<input
							type="date"
							value={customTo}
							onChange={(e) => setCustomTo(e.target.value)}
							style={{
								padding: "0.35rem 0.55rem",
								borderRadius: "6px",
								border: "1px solid var(--border-color)",
								background: "var(--bg-alt)",
								color: "var(--text)",
								fontSize: "0.8rem",
							}}
						/>
					</div>
					{(!customFrom || !customTo) && (
						<span
							style={{
								fontSize: "0.72rem",
								color: "var(--warning)",
							}}>
							Veuillez sélectionner les deux dates
						</span>
					)}
				</div>
			)}

			{/* Loading */}
			{loading && (
				<div
					style={{
						textAlign: "center",
						padding: "3rem",
						color: "var(--text-muted)",
						fontSize: "0.9rem",
					}}>
					Chargement des données analytiques...
				</div>
			)}

			{!loading && (
				<>
					{/* ════════════════════════════
					    APERCU GENERAL — stat cards
					    ════════════════════════════ */}
					<Section
						title="Aperçu général"
						icon={
							<svg
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="var(--text-muted)"
								strokeWidth="2">
								<rect x="3" y="3" width="7" height="7" rx="1" />
								<rect
									x="14"
									y="3"
									width="7"
									height="7"
									rx="1"
								/>
								<rect
									x="3"
									y="14"
									width="7"
									height="7"
									rx="1"
								/>
								<rect
									x="14"
									y="14"
									width="7"
									height="7"
									rx="1"
								/>
							</svg>
						}>
						<div
							className="stats-grid"
							style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
							{/* Total ventes */}
							<StatCard
								label="Total ventes"
								value={formatNumber(sales.length)}
								sub={`${completedSales.length} complétées · ${PERIOD_LABELS[period]}`}
								color="var(--accent)"
								onClick={() =>
									openModal(
										"sales",
										"Total ventes — détail",
										sales,
									)
								}
							/>

							{/* Nouveaux clients */}
							<StatCard
								label="Nouveaux clients"
								value={formatNumber(newClients.length)}
								sub={`${allClients.length} au total`}
								color="#8b5cf6"
								onClick={() =>
									openModal(
										"clients_new",
										"Nouveaux clients",
										newClients,
									)
								}
							/>

							{/* Tâches actives */}
							<StatCard
								label="Tâches actives"
								value={formatNumber(activeTasks.length)}
								sub={`${overdueTasks.length} en retard`}
								color="var(--warning)"
								onClick={() =>
									openModal(
										"tasks_active",
										"Tâches actives",
										activeTasks,
									)
								}
							/>

							{/* Projets actifs */}
							<StatCard
								label="Projets actifs"
								value={formatNumber(activeProjects.length)}
								sub={`${allProjects.length} au total`}
								color="var(--success)"
								onClick={() =>
									openModal(
										"projects_active",
										"Projets actifs",
										activeProjects,
									)
								}
							/>

							{/* Produits en alerte */}
							<StatCard
								label="Alertes stock"
								value={formatNumber(alertProducts.length)}
								sub={`${allProducts.length} produits gérés`}
								color="var(--danger)"
								onClick={() =>
									openModal(
										"products_alert",
										"Produits en alerte stock",
										alertProducts.map((p) => ({
											...p,
											totalStock:
												p.stocks?.reduce(
													(s, st) => s + st.quantity,
													0,
												) ?? 0,
										})),
									)
								}
							/>
						</div>
					</Section>

					{/* ════════════════════════════
					    PERFORMANCE COMMERCIALE
					    ════════════════════════════ */}
					<Section
						title="Performance commerciale"
						icon={
							<svg
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="var(--text-muted)"
								strokeWidth="2">
								<polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
							</svg>
						}>
						{/* Row 1: stats */}
						<div
							className="stats-grid"
							style={{
								gridTemplateColumns: "repeat(3, 1fr)",
								marginBottom: "1.5rem",
							}}>
							<StatCard
								label="Ventes complétées"
								value={formatNumber(completedSales.length)}
								sub={`Taux : ${conversionRate.toFixed(1)}%`}
								color="var(--success)"
								onClick={() =>
									openModal(
										"sales",
										"Ventes complétées",
										completedSales,
									)
								}
							/>
							<StatCard
								label="Ventes reportées"
								value={formatNumber(postponedSales.length)}
								sub="En attente de finalisation"
								color="var(--warning)"
								onClick={() =>
									openModal(
										"sales",
										"Ventes reportées",
										postponedSales,
									)
								}
							/>
							<StatCard
								label="Ventes annulées"
								value={formatNumber(cancelledSales.length)}
								sub={
									sales.length > 0
										? `${((cancelledSales.length / sales.length) * 100).toFixed(1)}% du total`
										: "—"
								}
								color="var(--danger)"
								onClick={() =>
									openModal(
										"sales",
										"Ventes annulées",
										cancelledSales,
									)
								}
							/>
						</div>

						{/* Sales count chart */}
						<div style={{ marginBottom: "1.5rem" }}>
							<div
								style={{
									fontSize: "0.82rem",
									fontWeight: 600,
									color: "var(--text)",
									marginBottom: "0.75rem",
								}}>
								Ventes par période — {PERIOD_LABELS[period]}
							</div>
							{salesChartData.length === 0 ||
							sales.length === 0 ? (
								<div
									style={{
										height: "200px",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										color: "var(--text-muted)",
										fontSize: "0.85rem",
									}}>
									Aucune donnée pour cette période
								</div>
							) : (
								<BarChart
									data={salesChartData}
									height={200}
									onBarEnter={(e, label, value) =>
										setTooltip({
											x: e.clientX,
											y: e.clientY - 50,
											label,
											value: `${value} vente(s)`,
										})
									}
									onBarLeave={() => setTooltip(null)}
								/>
							)}
						</div>

						{/* Top sellers + platforms */}
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "1fr 1fr",
								gap: "1.5rem",
							}}>
							<div>
								<div
									style={{
										fontSize: "0.82rem",
										fontWeight: 600,
										color: "var(--text)",
										marginBottom: "0.75rem",
									}}>
									Top vendeurs (nb ventes)
								</div>
								<RankingList
									rows={sellerRanking}
									maxCount={sellerRanking[0]?.count ?? 1}
									barColor="var(--success)"
									renderRight={(row) => (
										<>
											<div
												style={{
													fontSize: "0.78rem",
													fontWeight: 700,
												}}>
												{formatNumber(row.count)} ventes
											</div>
											<div
												style={{
													fontSize: "0.65rem",
													color: "var(--text-muted)",
												}}>
												{row.share.toFixed(1)}&nbsp;%
											</div>
										</>
									)}
								/>
							</div>
							<div>
								<div
									style={{
										fontSize: "0.82rem",
										fontWeight: 600,
										color: "var(--text)",
										marginBottom: "0.75rem",
									}}>
									Par plateforme
								</div>
								<RankingList
									rows={platformRanking}
									maxCount={platformRanking[0]?.count ?? 1}
									barColor="var(--accent)"
									renderRight={(row) => (
										<>
											<div
												style={{
													fontSize: "0.78rem",
													fontWeight: 700,
												}}>
												{formatNumber(row.count)} ventes
											</div>
											<div
												style={{
													fontSize: "0.65rem",
													color: "var(--text-muted)",
												}}>
												{row.share.toFixed(1)}&nbsp;%
											</div>
										</>
									)}
								/>
							</div>
						</div>

						{/* Sales status distribution donut */}
						<div style={{ marginTop: "1.5rem" }}>
							<div
								style={{
									fontSize: "0.82rem",
									fontWeight: 600,
									color: "var(--text)",
									marginBottom: "0.75rem",
								}}>
								Répartition par statut
							</div>
							<DonutChart
								segments={saleStatusSegments}
								centerLabel="ventes"
							/>
						</div>

						{/* Busiest day insight */}
						{sales.length > 0 && (
							<div style={{ marginTop: "1.5rem" }}>
								<DayHeatmap
									data={dayOfWeekData}
									label="Ventes par jour de la semaine"
								/>
								<div
									style={{
										fontSize: "0.72rem",
										color: "var(--text-muted)",
										marginTop: "0.5rem",
									}}>
									Jour le plus actif :{" "}
									<strong style={{ color: "var(--accent)" }}>
										{DAY_NAMES_FULL_FR[busiestDayIdx]}
									</strong>
								</div>
							</div>
						)}
					</Section>

					{/* ════════════════════════════
					    CLIENTS
					    ════════════════════════════ */}
					<Section
						title="Clients"
						icon={
							<svg
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="var(--text-muted)"
								strokeWidth="2">
								<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
								<circle cx="9" cy="7" r="4" />
								<path d="M23 21v-2a4 4 0 0 0-3-3.87" />
								<path d="M16 3.13a4 4 0 0 1 0 7.75" />
							</svg>
						}>
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "1fr 1fr",
								gap: "1.5rem",
							}}>
							{/* New clients per month bar chart */}
							<div>
								<div
									style={{
										fontSize: "0.82rem",
										fontWeight: 600,
										color: "var(--text)",
										marginBottom: "0.75rem",
									}}>
									Nouveaux clients — 6 derniers mois
								</div>
								<BarChart
									data={clientsMonthlyData}
									height={160}
									onBarEnter={(e, label, value) =>
										setTooltip({
											x: e.clientX,
											y: e.clientY - 50,
											label,
											value: `${value} nouveau(x)`,
										})
									}
									onBarLeave={() => setTooltip(null)}
								/>
							</div>

							{/* Client status donut */}
							<div>
								<div
									style={{
										fontSize: "0.82rem",
										fontWeight: 600,
										color: "var(--text)",
										marginBottom: "0.75rem",
									}}>
									Répartition par statut
								</div>
								<DonutChart
									segments={clientStatusSegments}
									centerLabel="clients"
								/>
							</div>
						</div>
					</Section>

					{/* ════════════════════════════
					    ACTIVITE DES EQUIPES
					    ════════════════════════════ */}
					<Section
						title="Activité des équipes"
						icon={
							<svg
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="var(--text-muted)"
								strokeWidth="2">
								<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
								<circle cx="12" cy="7" r="4" />
							</svg>
						}>
						<div
							className="stats-grid"
							style={{
								gridTemplateColumns: "repeat(3, 1fr)",
								marginBottom: "1.5rem",
							}}>
							<StatCard
								label="Tâches totales"
								value={formatNumber(allTasks.length)}
								sub={`${completedTasksPeriod.length} terminées sur la période`}
								color="var(--accent)"
							/>
							<StatCard
								label="Tâches en retard"
								value={formatNumber(overdueTasks.length)}
								sub="Échéance dépassée, non terminées"
								color="var(--danger)"
								onClick={() =>
									openModal(
										"tasks_overdue",
										"Tâches en retard",
										overdueTasks,
									)
								}
							/>
							<StatCard
								label="Utilisateurs actifs"
								value={formatNumber(
									allUsers.filter((u) => u.active).length,
								)}
								sub={`${allUsers.length} au total`}
								color="var(--success)"
							/>
						</div>

						{/* Task distribution donut + completed by user */}
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "1fr 1fr",
								gap: "1.5rem",
							}}>
							<div>
								<div
									style={{
										fontSize: "0.82rem",
										fontWeight: 600,
										color: "var(--text)",
										marginBottom: "0.75rem",
									}}>
									Répartition par statut
								</div>
								<DonutChart
									segments={taskStatusSegments}
									centerLabel="tâches"
								/>
							</div>
							<div>
								<div
									style={{
										fontSize: "0.82rem",
										fontWeight: 600,
										color: "var(--text)",
										marginBottom: "0.75rem",
									}}>
									Tâches terminées par membre —{" "}
									{PERIOD_LABELS[period]}
								</div>
								<RankingList
									rows={completedTasksByUser.slice(0, 8)}
									maxCount={
										completedTasksByUser[0]?.count ?? 1
									}
									barColor="var(--success)"
									renderRight={(row) => (
										<div
											style={{
												fontSize: "0.78rem",
												fontWeight: 700,
											}}>
											{formatNumber(row.count)}
										</div>
									)}
								/>
							</div>
						</div>

						{/* All tasks by user */}
						<div style={{ marginTop: "1.5rem" }}>
							<div
								style={{
									fontSize: "0.82rem",
									fontWeight: 600,
									color: "var(--text)",
									marginBottom: "0.75rem",
								}}>
								Total assignations par membre
							</div>
							<RankingList
								rows={tasksByUser}
								maxCount={tasksByUser[0]?.count ?? 1}
								barColor="#8b5cf6"
								renderRight={(row) => (
									<>
										<div
											style={{
												fontSize: "0.78rem",
												fontWeight: 700,
											}}>
											{formatNumber(row.count)} tâches
										</div>
										<div
											style={{
												fontSize: "0.65rem",
												color: "var(--text-muted)",
											}}>
											{row.share.toFixed(1)}&nbsp;%
										</div>
									</>
								)}
							/>
						</div>
					</Section>

					{/* ════════════════════════════
					    PROJETS
					    ════════════════════════════ */}
					<Section
						title="Projets"
						icon={
							<svg
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="var(--text-muted)"
								strokeWidth="2">
								<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
							</svg>
						}>
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "1fr 1fr",
								gap: "1.5rem",
							}}>
							{/* Project status donut */}
							<div>
								<div
									style={{
										fontSize: "0.82rem",
										fontWeight: 600,
										color: "var(--text)",
										marginBottom: "0.75rem",
									}}>
									Répartition par statut
								</div>
								<DonutChart
									segments={projectStatusSegments}
									centerLabel="projets"
								/>
							</div>

							{/* Completion rate per project */}
							<div>
								<div
									style={{
										fontSize: "0.82rem",
										fontWeight: 600,
										color: "var(--text)",
										marginBottom: "0.75rem",
									}}>
									Taux de complétion par projet
								</div>
								{allProjects.length === 0 ? (
									<div
										style={{
											color: "var(--text-muted)",
											fontSize: "0.82rem",
											padding: "1rem",
											textAlign: "center",
										}}>
										Aucun projet
									</div>
								) : (
									<div
										style={{
											display: "flex",
											flexDirection: "column",
											gap: "0.65rem",
										}}>
										{allProjects
											.filter(
												(p) => (p.taskCount ?? 0) > 0,
											)
											.sort((a, b) => {
												const pctA =
													(a.taskCount ?? 0) > 0
														? ((a.completedTaskCount ??
																0) /
																(a.taskCount ??
																	1)) *
															100
														: 0;
												const pctB =
													(b.taskCount ?? 0) > 0
														? ((b.completedTaskCount ??
																0) /
																(b.taskCount ??
																	1)) *
															100
														: 0;
												return pctB - pctA;
											})
											.slice(0, 8)
											.map((p) => {
												const total = p.taskCount ?? 0;
												const done =
													p.completedTaskCount ?? 0;
												const pct =
													total > 0
														? Math.round(
																(done / total) *
																	100,
															)
														: 0;
												return (
													<div key={p.id}>
														<div
															style={{
																display: "flex",
																justifyContent:
																	"space-between",
																marginBottom:
																	"3px",
															}}>
															<span
																style={{
																	fontSize:
																		"0.8rem",
																	fontWeight: 600,
																	maxWidth:
																		"160px",
																	overflow:
																		"hidden",
																	textOverflow:
																		"ellipsis",
																	whiteSpace:
																		"nowrap",
																}}>
																{p.emoji &&
																	`${p.emoji} `}
																{p.name}
															</span>
															<span
																style={{
																	fontSize:
																		"0.78rem",
																	fontWeight: 700,
																	color:
																		pct >=
																		75
																			? "var(--success)"
																			: pct >=
																				  40
																				? "var(--warning)"
																				: "var(--danger)",
																}}>
																{pct}%
															</span>
														</div>
														<RankingBar
															percent={pct}
															color={
																pct >= 75
																	? "var(--success)"
																	: pct >= 40
																		? "var(--warning)"
																		: "var(--danger)"
															}
														/>
														<div
															style={{
																fontSize:
																	"0.65rem",
																color: "var(--text-muted)",
																marginTop:
																	"2px",
															}}>
															{done}/{total}{" "}
															tâches
														</div>
													</div>
												);
											})}
									</div>
								)}
							</div>
						</div>
					</Section>

					{/* ════════════════════════════
					    PRODUITS
					    ════════════════════════════ */}
					<Section
						title="Produits"
						icon={
							<svg
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="var(--text-muted)"
								strokeWidth="2">
								<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
							</svg>
						}>
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "1fr 1fr",
								gap: "1.5rem",
							}}>
							{/* Most sold products */}
							<div>
								<div
									style={{
										fontSize: "0.82rem",
										fontWeight: 600,
										color: "var(--text)",
										marginBottom: "0.75rem",
									}}>
									Produits les plus vendus (unités) —{" "}
									{PERIOD_LABELS[period]}
								</div>
								<RankingList
									rows={productRanking}
									maxCount={productRanking[0]?.count ?? 1}
									barColor="var(--accent)"
									renderRight={(row) => (
										<>
											<div
												style={{
													fontSize: "0.78rem",
													fontWeight: 700,
												}}>
												{formatNumber(row.count)} unités
											</div>
											<div
												style={{
													fontSize: "0.65rem",
													color: "var(--text-muted)",
												}}>
												{row.share.toFixed(1)}&nbsp;%
											</div>
										</>
									)}
								/>
							</div>

							{/* Stock alerts */}
							<div>
								<div
									style={{
										fontSize: "0.82rem",
										fontWeight: 600,
										color: "var(--text)",
										marginBottom: "0.75rem",
									}}>
									Alertes de stock ({alertProducts.length})
								</div>
								{alertProducts.length === 0 ? (
									<div
										style={{
											color: "var(--text-muted)",
											fontSize: "0.82rem",
											padding: "1rem",
											textAlign: "center",
										}}>
										Aucun produit sous le seuil
										d&apos;alerte
									</div>
								) : (
									<div
										style={{
											display: "flex",
											flexDirection: "column",
											gap: "0.6rem",
										}}>
										{alertProducts.slice(0, 8).map((p) => {
											const totalStock =
												p.stocks?.reduce(
													(s, st) => s + st.quantity,
													0,
												) ?? 0;
											const stockPct =
												p.alertThreshold > 0
													? Math.min(
															(totalStock /
																p.alertThreshold) *
																100,
															100,
														)
													: 0;
											return (
												<div key={p.id}>
													<div
														style={{
															display: "flex",
															justifyContent:
																"space-between",
															marginBottom: "3px",
														}}>
														<span
															style={{
																fontSize:
																	"0.8rem",
																fontWeight: 600,
																maxWidth:
																	"160px",
																overflow:
																	"hidden",
																textOverflow:
																	"ellipsis",
																whiteSpace:
																	"nowrap",
															}}>
															{p.name}
														</span>
														<span
															style={{
																fontSize:
																	"0.78rem",
																fontWeight: 700,
																color:
																	totalStock ===
																	0
																		? "var(--danger)"
																		: "var(--warning)",
															}}>
															{totalStock} /{" "}
															{p.alertThreshold}
														</span>
													</div>
													<RankingBar
														percent={stockPct}
														color={
															totalStock === 0
																? "var(--danger)"
																: "var(--warning)"
														}
													/>
												</div>
											);
										})}
										{alertProducts.length > 8 && (
											<button
												className="btn-secondary"
												style={{
													fontSize: "0.78rem",
													padding: "0.35rem 0.75rem",
													marginTop: "0.25rem",
												}}
												onClick={() =>
													openModal(
														"products_alert",
														"Tous les produits en alerte",
														alertProducts.map(
															(p) => ({
																...p,
																totalStock:
																	p.stocks?.reduce(
																		(
																			s,
																			st,
																		) =>
																			s +
																			st.quantity,
																		0,
																	) ?? 0,
															}),
														),
													)
												}>
												Voir tous (
												{alertProducts.length})
											</button>
										)}
									</div>
								)}
							</div>
						</div>

						{/* Sparkline for sales trend last 7 days */}
						{completedSales.length > 0 && (
							<div
								style={{
									marginTop: "1.5rem",
									padding: "1rem",
									background: "var(--bg-alt)",
									borderRadius: "8px",
								}}>
								<div
									style={{
										fontSize: "0.78rem",
										fontWeight: 600,
										marginBottom: "0.5rem",
										color: "var(--text)",
									}}>
									Tendance des ventes — 7 derniers jours
								</div>
								<Sparkline
									values={Array.from(
										{ length: 7 },
										(_, i) => {
											const d = new Date(
												Date.now() - (6 - i) * 86400000,
											)
												.toISOString()
												.slice(0, 10);
											return allSales.filter(
												(s) =>
													s.status === "completed" &&
													new Date(s.date)
														.toISOString()
														.slice(0, 10) === d,
											).length;
										},
									)}
									color="var(--accent)"
								/>
								<div
									style={{
										fontSize: "0.68rem",
										color: "var(--text-muted)",
										marginTop: "4px",
									}}>
									Ventes complétées par jour
								</div>
							</div>
						)}
					</Section>
				</>
			)}

			{/* Fixed tooltip for charts */}
			{tooltip && (
				<div
					style={{
						position: "fixed",
						left: tooltip.x,
						top: tooltip.y,
						background: "var(--sidebar-bg)",
						color: "#fff",
						padding: "0.5rem 0.85rem",
						borderRadius: "8px",
						boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
						zIndex: 9999,
						pointerEvents: "none",
						fontSize: "0.8rem",
						fontWeight: 600,
						whiteSpace: "nowrap",
					}}>
					<div>{tooltip.value}</div>
					<div
						style={{
							fontSize: "0.68rem",
							fontWeight: 400,
							opacity: 0.75,
							marginTop: "2px",
						}}>
						{tooltip.label}
					</div>
				</div>
			)}

			{/* Stat detail modal */}
			{statModal && (
				<Modal
					title={statModal.title}
					onClose={() => setStatModal(null)}>
					{renderModalContent(statModal)}
				</Modal>
			)}
		</div>
	);
}
