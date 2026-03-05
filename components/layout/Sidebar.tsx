"use client";

import React, { useState, useContext, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { ThemeContext } from "@/components/providers/ThemeProvider";
import { canAccessPage } from "@/lib/rbac";
import api from "@/lib/api-client";
import type { Sale, Task, Log } from "@/types";

interface NavItem {
	href: string;
	label: string;
	page: string;
	icon: React.ReactNode;
	adminOnly?: boolean;
	financeOnly?: boolean;
}

const SECTIONS: { label: string; items: NavItem[] }[] = [
	{
		label: "Système",
		items: [
			{
				href: "/dashboard",
				label: "Dashboard",
				page: "dashboard",
				icon: (
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
						<rect x="3" y="3" width="7" height="7" rx="1" />
						<rect x="14" y="3" width="7" height="7" rx="1" />
						<rect x="14" y="14" width="7" height="7" rx="1" />
						<rect x="3" y="14" width="7" height="7" rx="1" />
					</svg>
				),
			},
			{
				href: "/logs",
				label: "Journal",
				page: "logs",
				icon: (
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
						<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
						<polyline points="14 2 14 8 20 8" />
						<line x1="16" y1="13" x2="8" y2="13" />
						<line x1="16" y1="17" x2="8" y2="17" />
					</svg>
				),
				adminOnly: true,
			},
		],
	},
	{
		label: "Gestion",
		items: [
			{
				href: "/products",
				label: "Produits",
				page: "products",
				icon: (
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
						<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
					</svg>
				),
			},
			{
				href: "/clients",
				label: "Clients",
				page: "clients",
				icon: (
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
						<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
						<circle cx="9" cy="7" r="4" />
						<path d="M23 21v-2a4 4 0 0 0-3-3.87" />
						<path d="M16 3.13a4 4 0 0 1 0 7.75" />
					</svg>
				),
			},
			{
				href: "/users",
				label: "Utilisateurs",
				page: "users",
				icon: (
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
						<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
						<circle cx="12" cy="7" r="4" />
					</svg>
				),
				adminOnly: true,
			},
		],
	},
	{
		label: "Finance",
		items: [
			{
				href: "/sales",
				label: "Ventes",
				page: "sales",
				icon: (
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
						<circle cx="9" cy="21" r="1" />
						<circle cx="20" cy="21" r="1" />
						<path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
					</svg>
				),
			},
			{
				href: "/accounting",
				label: "Comptabilité",
				page: "accounting",
				icon: (
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
						<line x1="12" y1="1" x2="12" y2="23" />
						<path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
					</svg>
				),
				financeOnly: true,
			},
			{
				href: "/analytics",
				label: "Analytics",
				page: "analytics",
				icon: (
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
						<line x1="18" y1="20" x2="18" y2="10" />
						<line x1="12" y1="20" x2="12" y2="4" />
						<line x1="6" y1="20" x2="6" y2="14" />
					</svg>
				),
				financeOnly: true,
			},
		],
	},
	{
		label: "Espace travail",
		items: [
			{
				href: "/tasks",
				label: "Tâches",
				page: "tasks",
				icon: (
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
						<polyline points="9 11 12 14 22 4" />
						<path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
					</svg>
				),
			},
			{
				href: "/projects",
				label: "Projets",
				page: "projects",
				icon: (
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
						<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
					</svg>
				),
			},
			{
				href: "/calendar",
				label: "Calendrier",
				page: "calendar",
				icon: (
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
						<rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
						<line x1="16" y1="2" x2="16" y2="6" />
						<line x1="8" y1="2" x2="8" y2="6" />
						<line x1="3" y1="10" x2="21" y2="10" />
					</svg>
				),
			},
		],
	},
];

const FONT_SIZE_LABELS = [
	{ value: "compact" as const, label: "Compact" },
	{ value: "normal" as const, label: "Normal" },
	{ value: "confort" as const, label: "Confort" },
];

/**
 * Build CSS style object for an icon button in the bottom bar
 * @param active - Whether the button is in an active/toggled state
 * @returns React CSSProperties object
 */
function iconButtonStyle(active: boolean): React.CSSProperties {
	return {
		width: "30px",
		height: "30px",
		minWidth: "30px",
		background: active ? "rgba(255,255,255,0.1)" : "transparent",
		border: `1px solid ${active ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)"}`,
		borderRadius: "7px",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		cursor: "pointer",
		color: "rgba(255,255,255,0.6)",
		transition: "all 0.15s ease",
		flexShrink: 0,
	};
}

/**
 * Apply hover visual state to an icon button element
 * @param el - Target button element
 * @returns void
 */
function applyIconButtonHover(el: HTMLButtonElement): void {
	el.style.background = "rgba(255,255,255,0.08)";
	el.style.borderColor = "rgba(255,255,255,0.2)";
}

/**
 * Remove hover visual state from an icon button element
 * @param el - Target button element
 * @param active - Whether the button is currently in an active state
 * @returns void
 */
function removeIconButtonHover(el: HTMLButtonElement, active: boolean): void {
	if (!active) el.style.background = "transparent";
	el.style.borderColor = "rgba(255,255,255,0.1)";
}

/**
 * Format a raw date as a short relative human-readable label
 * @param raw - ISO date string or Date object
 * @returns Short relative string like "Il y a 3h"
 */
function formatTimestamp(raw: Date | string): string {
	const date = new Date(raw);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMins = Math.floor(diffMs / 60000);
	if (diffMins < 1) return "À l'instant";
	if (diffMins < 60) return `Il y a ${diffMins}min`;
	const diffHours = Math.floor(diffMins / 60);
	if (diffHours < 24) return `Il y a ${diffHours}h`;
	const diffDays = Math.floor(diffHours / 24);
	return `Il y a ${diffDays}j`;
}

/**
 * Resolve the CSS badge variant suffix for a given user role string
 * @param role - User role string or undefined
 * @returns Badge variant suffix string
 */
function roleBadgeClass(role: string | undefined): string {
	if (role === "admin") return "danger";
	if (role === "finance") return "warning";
	if (role === "member") return "primary";
	return "light";
}

// Shape of profile data loaded in the modal
interface ProfileData {
	salesThisMonth: number;
	activeTasks: number;
	recentActivity: number;
	recentLogs: Log[];
	myPendingTasks: Task[];
}

/**
 * Full profile modal showing user info, stats, activity timeline and pending tasks
 * @param onClose - Callback invoked when the modal is dismissed
 * @param onLogout - Callback invoked when the logout button is clicked
 * @returns Modal overlay JSX element
 */
function ProfileModal({
	onClose,
	onLogout,
}: {
	onClose: () => void;
	onLogout: () => void;
}): React.ReactElement {
	const { user } = useAuth();
	const [data, setData] = useState<ProfileData | null>(null);
	const [loading, setLoading] = useState(true);

	// Fetch all profile data when the modal mounts
	useEffect(() => {
		/**
		 * Load sales, tasks and logs in parallel then populate state
		 * @returns Promise resolving to void
		 */
		async function load(): Promise<void> {
			if (!user) return;
			try {
				// Fetch all required endpoints simultaneously
				const [allSales, allTasks, userLogs, globalLogs, pendingTasks] =
					await Promise.all([
						api.get<Sale[]>("/sales"),
						api.get<Task[]>("/tasks"),
						api.get<Log[]>(`/logs?userId=${user.id}&limit=10`),
						api.get<Log[]>("/logs?limit=5"),
						api.get<Task[]>(`/tasks?assigneeId=${user.id}`),
					]);

				// Filter sales to the current calendar month
				const now = new Date();
				const salesThisMonth = allSales.filter((s) => {
					const d = new Date(s.date);
					return (
						d.getMonth() === now.getMonth() &&
						d.getFullYear() === now.getFullYear()
					);
				}).length;

				// Count active tasks assigned to this user
				const activeTasks = allTasks.filter(
					(t) => t.assigneeId === user.id && !t.completed && !t.cancelled,
				).length;

				const recentActivity = userLogs.length;
				const myPendingTasks = pendingTasks
					.filter((t) => !t.completed && !t.cancelled)
					.slice(0, 5);

				setData({ salesThisMonth, activeTasks, recentActivity, recentLogs: globalLogs, myPendingTasks });
			} catch {
				// Keep null on error, spinner resolves via finally
			} finally {
				setLoading(false);
			}
		}
		load();
	}, [user]);

	return (
		<div
			className="modal-overlay"
			style={{ zIndex: 10000 }}
			onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
			<div
				className="modal-content"
				style={{ maxWidth: "520px", width: "100%", maxHeight: "85vh", overflowY: "auto" }}>

				{/* Header: large avatar, name, role badge, username */}
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: "1rem",
						paddingBottom: "1.25rem",
						borderBottom: "1px solid var(--border-color)",
						marginBottom: "1.25rem",
					}}>
					<div
						style={{
							width: "60px",
							height: "60px",
							minWidth: "60px",
							background: "#b8923a",
							borderRadius: "14px",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							fontSize: "1.6rem",
							color: "#1a2744",
							fontWeight: 700,
						}}>
						{user?.avatar || user?.name?.charAt(0) || "?"}
					</div>
					<div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
						<div style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--text)" }}>
							{user?.name}
						</div>
						<span
							className={`badge badge-${roleBadgeClass(user?.role)}`}
							style={{ fontSize: "0.7rem", width: "fit-content" }}>
							{user?.role}
						</span>
						<div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
							@{user?.username}
						</div>
					</div>
				</div>

				{/* Stats row: sales this month, active tasks, recent activity */}
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "1fr 1fr 1fr",
						gap: "0.75rem",
						marginBottom: "1.5rem",
					}}>
					{[
						{ label: "Ventes ce mois", value: loading ? "..." : String(data?.salesThisMonth ?? 0) },
						{ label: "Tâches actives", value: loading ? "..." : String(data?.activeTasks ?? 0) },
						{ label: "Actions récentes", value: loading ? "..." : String(data?.recentActivity ?? 0) },
					].map((stat) => (
						<div
							key={stat.label}
							style={{
								background: "var(--bg-alt)",
								border: "1px solid var(--border-color)",
								borderRadius: "10px",
								padding: "0.75rem",
								textAlign: "center",
							}}>
							<div style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--accent)" }}>
								{stat.value}
							</div>
							<div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
								{stat.label}
							</div>
						</div>
					))}
				</div>

				{/* Recent activity log timeline */}
				<div style={{ marginBottom: "1.5rem" }}>
					<div
						style={{
							fontSize: "0.72rem",
							fontWeight: 700,
							color: "var(--text-muted)",
							textTransform: "uppercase",
							letterSpacing: "0.1em",
							marginBottom: "0.65rem",
						}}>
						Activité récente
					</div>
					{loading && <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>Chargement...</div>}
					{!loading && !data?.recentLogs.length && (
						<div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>Aucune activité</div>
					)}
					<div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
						{data?.recentLogs.map((log) => (
							<div
								key={log.id}
								style={{ display: "flex", alignItems: "flex-start", gap: "0.65rem", fontSize: "0.8rem" }}>
								<div
									style={{
										width: "7px",
										height: "7px",
										minWidth: "7px",
										background: "var(--accent)",
										borderRadius: "50%",
										marginTop: "5px",
									}}
								/>
								<div style={{ flex: 1 }}>
									<span style={{ color: "var(--text)", fontWeight: 500 }}>{log.action}</span>
									{log.details && (
										<span style={{ color: "var(--text-muted)", marginLeft: "0.35rem" }}>{log.details}</span>
									)}
								</div>
								<div style={{ color: "var(--text-muted)", fontSize: "0.72rem", whiteSpace: "nowrap" }}>
									{formatTimestamp(log.timestamp)}
								</div>
							</div>
						))}
					</div>
				</div>

				{/* Pending tasks as badge pills */}
				<div style={{ marginBottom: "1.75rem" }}>
					<div
						style={{
							fontSize: "0.72rem",
							fontWeight: 700,
							color: "var(--text-muted)",
							textTransform: "uppercase",
							letterSpacing: "0.1em",
							marginBottom: "0.65rem",
						}}>
						Mes tâches en attente
					</div>
					{loading && <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>Chargement...</div>}
					{!loading && !data?.myPendingTasks.length && (
						<div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>Aucune tâche en attente</div>
					)}
					<div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
						{data?.myPendingTasks.map((task) => (
							<span
								key={task.id}
								style={{
									background: "rgba(var(--accent-rgb, 184,146,58), 0.12)",
									border: "1px solid rgba(var(--accent-rgb, 184,146,58), 0.25)",
									color: "var(--accent)",
									borderRadius: "6px",
									padding: "0.25rem 0.6rem",
									fontSize: "0.75rem",
									fontWeight: 500,
									maxWidth: "200px",
									overflow: "hidden",
									textOverflow: "ellipsis",
									whiteSpace: "nowrap",
								}}>
								{task.title}
							</span>
						))}
					</div>
				</div>

				{/* Footer: logout danger button + close secondary button */}
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						gap: "0.75rem",
						paddingTop: "1rem",
						borderTop: "1px solid var(--border-color)",
					}}>
					<button className="btn-danger btn-sm" onClick={onLogout}>
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: "0.4rem" }}>
							<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
							<polyline points="16 17 21 12 16 7" />
							<line x1="21" y1="12" x2="9" y2="12" />
						</svg>
						Déconnexion
					</button>
					<button className="btn-secondary btn-sm" onClick={onClose}>
						Fermer
					</button>
				</div>
			</div>
		</div>
	);
}

/**
 * Main sidebar navigation component with vertically centered fixed positioning
 * @returns Aside element containing nav sections, bottom bar and overlays
 */
export function Sidebar(): React.ReactElement {
	const { user, logout } = useAuth();
	const pathname = usePathname();
	const { dark, fontSize, toggleDark, setFontSize } = useContext(ThemeContext);
	const [showSettings, setShowSettings] = useState(false);
	const [showProfile, setShowProfile] = useState(false);

	const role = user?.role || "viewer";

	/**
	 * Open the profile modal and close the settings panel
	 * @returns void
	 */
	function handleOpenProfile(): void {
		setShowProfile(true);
		setShowSettings(false);
	}

	/**
	 * Close the full profile modal
	 * @returns void
	 */
	function handleCloseProfile(): void {
		setShowProfile(false);
	}

	/**
	 * Toggle the settings panel and close the profile modal
	 * @returns void
	 */
	function handleToggleSettings(): void {
		setShowSettings((s) => !s);
		setShowProfile(false);
	}

	return (
		<>
			<aside
				style={{
					position: "fixed",
					left: "12px",
					top: "50%",
					transform: "translateY(-50%)",
					width: "240px",
					height: "fit-content",
					maxHeight: "85vh",
					background: "var(--sidebar-bg)",
					borderRadius: "16px",
					border: "1px solid rgba(255,255,255,0.08)",
					display: "flex",
					flexDirection: "column",
					zIndex: 1000,
					overflowX: "hidden",
					boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
				}}>

				{/* Brand logo */}
				<div
					style={{
						padding: "1.15rem 1.1rem",
						display: "flex",
						alignItems: "center",
						gap: "0.75rem",
					}}>
					<div
						style={{
							width: "34px",
							height: "34px",
							minWidth: "34px",
							background: "linear-gradient(135deg, #b8923a, #d4aa5a)",
							borderRadius: "9px",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							fontFamily: "var(--font-cinzel, Cinzel, serif)",
							fontWeight: 800,
							fontSize: "1rem",
							color: "#1a2744",
						}}>
						L
					</div>
					<div>
						<div
							style={{
								fontFamily: "var(--font-cinzel, Cinzel, serif)",
								fontWeight: 800,
								fontSize: "0.95rem",
								color: "#b8923a",
								lineHeight: 1,
							}}>
							Lance
						</div>
						<div
							style={{
								fontFamily: "var(--font-cinzel, Cinzel, serif)",
								fontWeight: 600,
								fontSize: "0.6rem",
								color: "rgba(255,255,255,0.35)",
								letterSpacing: "0.12em",
								textTransform: "uppercase",
								lineHeight: 1,
								marginTop: "2px",
							}}>
							Strategy
						</div>
					</div>
				</div>

				{/* Navigation sections with scroll for short viewports */}
				<nav
					style={{
						padding: "0.25rem 0.6rem",
						overflowY: "auto",
						display: "flex",
						flexDirection: "column",
						gap: "0.15rem",
					}}>
					{SECTIONS.map((section, sIdx) => {
						// Apply RBAC filtering to each section item
						const visibleItems = section.items.filter((item) => {
							if (item.adminOnly && role !== "admin") return false;
							if (item.financeOnly && role !== "admin" && role !== "finance") return false;
							return canAccessPage(role, item.page);
						});

						if (!visibleItems.length) return null;

						return (
							<div key={section.label}>
								{/* Unfilled horizontal divider between sections */}
								{sIdx > 0 && (
									<div
										style={{
											height: "1px",
											background: "rgba(255,255,255,0.06)",
											margin: "0.6rem 0.5rem",
										}}
									/>
								)}
								{/* Section label */}
								<div
									style={{
										padding: "0.45rem 0.65rem 0.25rem",
										fontSize: "0.62rem",
										fontWeight: 700,
										color: "rgba(255,255,255,0.25)",
										textTransform: "uppercase",
										letterSpacing: "0.1em",
									}}>
									{section.label}
								</div>

								{/* Nav links for this section */}
								{visibleItems.map((item) => {
									const isActive =
										pathname === item.href || pathname.startsWith(`${item.href}/`);
									return (
										<Link
											key={item.href}
											href={item.href}
											style={{
												display: "flex",
												alignItems: "center",
												gap: "0.7rem",
												padding: "0.55rem 0.65rem",
												color: isActive ? "#ffffff" : "rgba(255,255,255,0.5)",
												background: isActive ? "rgba(184,146,58,0.15)" : "transparent",
												borderLeft: isActive ? "3px solid #b8923a" : "3px solid transparent",
												textDecoration: "none",
												transition: "all 0.15s ease",
												fontWeight: isActive ? 600 : 400,
												fontSize: "0.84rem",
												borderRadius: "0 8px 8px 0",
												margin: "1px 0",
											}}
											onMouseEnter={(e) => {
												if (!isActive) {
													e.currentTarget.style.background = "rgba(255,255,255,0.06)";
													e.currentTarget.style.color = "rgba(255,255,255,0.8)";
												}
											}}
											onMouseLeave={(e) => {
												if (!isActive) {
													e.currentTarget.style.background = "transparent";
													e.currentTarget.style.color = "rgba(255,255,255,0.5)";
												}
											}}>
											<span style={{ flexShrink: 0, opacity: isActive ? 1 : 0.7 }}>
												{item.icon}
											</span>
											<span>{item.label}</span>
										</Link>
									);
								})}
							</div>
						);
					})}
				</nav>

				{/* Bottom bar: all buttons centered with equal spacing */}
				<div
					style={{
						borderTop: "1px solid rgba(255,255,255,0.06)",
						padding: "0.65rem 0.75rem",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						gap: "0.5rem",
					}}>

					{/* Avatar button opens full profile modal */}
					<button
						onClick={handleOpenProfile}
						style={{
							width: "32px",
							height: "32px",
							minWidth: "32px",
							background: "#b8923a",
							borderRadius: "8px",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							fontSize: "0.85rem",
							border: "none",
							cursor: "pointer",
							color: "#1a2744",
							fontWeight: 700,
							transition: "transform 0.15s",
							flexShrink: 0,
						}}
						onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.08)"; }}
						onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
						title={user?.name || "Profil"}>
						{user?.avatar || user?.name?.charAt(0) || "?"}
					</button>

					{/* Dark mode toggle icon */}
					<button
						onClick={toggleDark}
						style={{ ...iconButtonStyle(false), color: dark ? "#e4bc62" : "rgba(255,255,255,0.5)" }}
						onMouseEnter={(e) => applyIconButtonHover(e.currentTarget)}
						onMouseLeave={(e) => removeIconButtonHover(e.currentTarget, false)}
						title={dark ? "Mode clair" : "Mode sombre"}>
						{dark ? (
							<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
								<circle cx="12" cy="12" r="5" />
								<line x1="12" y1="1" x2="12" y2="3" />
								<line x1="12" y1="21" x2="12" y2="23" />
								<line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
								<line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
								<line x1="1" y1="12" x2="3" y2="12" />
								<line x1="21" y1="12" x2="23" y2="12" />
								<line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
								<line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
							</svg>
						) : (
							<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
								<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
							</svg>
						)}
					</button>

					{/* Settings panel toggle icon */}
					<button
						onClick={handleToggleSettings}
						style={iconButtonStyle(showSettings)}
						onMouseEnter={(e) => applyIconButtonHover(e.currentTarget)}
						onMouseLeave={(e) => removeIconButtonHover(e.currentTarget, showSettings)}
						title="Paramètres">
						<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
							<circle cx="12" cy="12" r="3" />
							<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
						</svg>
					</button>

					{/* Logout icon button */}
					<button
						onClick={logout}
						style={iconButtonStyle(false)}
						onMouseEnter={(e) => applyIconButtonHover(e.currentTarget)}
						onMouseLeave={(e) => removeIconButtonHover(e.currentTarget, false)}
						title="Déconnexion">
						<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
							<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
							<polyline points="16 17 21 12 16 7" />
							<line x1="21" y1="12" x2="9" y2="12" />
						</svg>
					</button>
				</div>

				{/* Settings panel popup */}
				{showSettings && (
					<div
						className="settings-panel"
						style={{
							left: "254px",
							bottom: "24px",
						}}>
						<div className="sp-header">
							<div className="sp-header-icon">
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
									<circle cx="12" cy="12" r="3" />
									<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
								</svg>
							</div>
							<p className="sp-title">Paramètres</p>
						</div>
						<div className="sp-body">
							<div>
								<p className="sp-section-label">Taille du texte</p>
								<div className="sp-size-pills">
									{FONT_SIZE_LABELS.map(({ value, label }) => (
										<button
											key={value}
											className={`sp-size-pill${fontSize === value ? " active" : ""}`}
											onClick={() => setFontSize(value)}>
											{label}
										</button>
									))}
								</div>
							</div>
						</div>
					</div>
				)}
			</aside>

			{/* Settings backdrop click to close */}
			{showSettings && (
				<div
					style={{ position: "fixed", inset: 0, zIndex: 998 }}
					onClick={() => setShowSettings(false)}
				/>
			)}

			{/* Full profile modal overlay */}
			{showProfile && (
				<ProfileModal
					onClose={handleCloseProfile}
					onLogout={logout}
				/>
			)}
		</>
	);
}
