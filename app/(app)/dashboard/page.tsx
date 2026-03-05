"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import api from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import type { Sale, Client, Task, Event, Product } from "@/types";

interface Log {
	id: number;
	action: string;
	details: string;
	module: string;
	timestamp: string;
	userName: string;
}

interface ProductWithStock extends Product {
	totalStock: number;
	isAlert: boolean;
}

function timeAgo(date: string | Date): string {
	const now = new Date();
	const d = new Date(date);
	const diff = now.getTime() - d.getTime();
	const minutes = Math.floor(diff / 60000);
	if (minutes < 1) return "à l'instant";
	if (minutes < 60) return `il y a ${minutes} min`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `il y a ${hours}h`;
	const days = Math.floor(hours / 24);
	if (days === 1) return "hier";
	if (days < 7) return `il y a ${days} jours`;
	return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

function formatCurrency(n: number): string {
	return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

function getGreeting(): string {
	const h = new Date().getHours();
	if (h < 7) return "Bonne nuit";
	if (h < 12) return "Bonjour";
	if (h < 18) return "Bon après-midi";
	return "Bonsoir";
}

const MODULE_COLORS: Record<string, string> = {
	sales: "var(--success)",
	clients: "#2e4a8a",
	products: "var(--warning)",
	tasks: "#6366f1",
	projects: "#8b5cf6",
	events: "#e74c3c",
	auth: "var(--text-muted)",
};

/** Detail modal state for notification click */
interface DetailModal {
	type: "stock" | "client" | "sale";
	data: ProductWithStock | Client | Sale;
}

export default function DashboardPage() {
	const { user } = useAuth();
	const { showToast } = useToast();
	const [detailModal, setDetailModal] = useState<DetailModal | null>(null);

	const [loading, setLoading] = useState(true);
	const [activeSection, setActiveSection] = useState<string>("all");

	const [recentSales, setRecentSales] = useState<Sale[]>([]);
	const [recentClients, setRecentClients] = useState<Client[]>([]);
	const [myTasks, setMyTasks] = useState<Task[]>([]);
	const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
	const [alertProducts, setAlertProducts] = useState<ProductWithStock[]>([]);
	const [recentLogs, setRecentLogs] = useState<Log[]>([]);
	const [stats, setStats] = useState({
		todaySales: 0,
		todayRevenue: 0,
		weekSales: 0,
		weekRevenue: 0,
		newClientsThisWeek: 0,
		pendingTasks: 0,
		upcomingEventsCount: 0,
		stockAlerts: 0,
	});

	const load = useCallback(async () => {
		try {
			const now = new Date();
			const weekAgo = new Date(now.getTime() - 7 * 86400000);
			const todayStart = new Date(
				now.getFullYear(),
				now.getMonth(),
				now.getDate(),
			);

			const [salesRes, clients, tasks, events, products, logsRes] =
				await Promise.all([
					api
						.get<{
							sales: Sale[];
							total: number;
						}>("/sales?limit=20&sort=date&order=desc")
						.catch(() => ({ sales: [] as Sale[], total: 0 })),
					api.get<Client[]>("/clients").catch(() => [] as Client[]),
					api.get<Task[]>("/tasks").catch(() => [] as Task[]),
					api
						.get<
							Event[]
						>(`/events?from=${weekAgo.toISOString().slice(0, 10)}&to=${new Date(now.getTime() + 14 * 86400000).toISOString().slice(0, 10)}`)
						.catch(() => [] as Event[]),
					api
						.get<Product[]>("/products")
						.catch(() => [] as Product[]),
					api
						.get<{ logs: Log[]; total: number }>("/logs?limit=30")
						.catch(() => ({ logs: [] as Log[], total: 0 })),
				]);

			const allSales = salesRes.sales || [];
			const allLogs = logsRes.logs || (logsRes as unknown as Log[]) || [];

			const enrichedProducts: ProductWithStock[] = products.map((p) => {
				const totalStock = (p.stocks || []).reduce(
					(sum, s) => sum + s.quantity,
					0,
				);
				return {
					...p,
					totalStock,
					isAlert: totalStock <= p.alertThreshold,
				};
			});

			const todaySales = allSales.filter(
				(s) => new Date(s.date) >= todayStart,
			);
			const weekSales = allSales.filter(
				(s) => new Date(s.date) >= weekAgo,
			);
			const completedToday = todaySales.filter(
				(s) => s.status === "completed",
			);
			const completedWeek = weekSales.filter(
				(s) => s.status === "completed",
			);
			const newClientsWeek = clients.filter(
				(c) => new Date(c.createdAt) >= weekAgo,
			);
			const pendingTasks = tasks.filter(
				(t) =>
					t.assigneeId === user?.id && !t.completed && !t.cancelled,
			);
			const upcoming = events
				.filter((e) => new Date(e.date) >= todayStart)
				.sort(
					(a, b) =>
						new Date(a.date).getTime() - new Date(b.date).getTime(),
				);
			const alerts = enrichedProducts.filter((p) => p.isAlert);

			setRecentSales(allSales.slice(0, 10));
			setRecentClients(newClientsWeek.slice(0, 5));
			setMyTasks(pendingTasks.slice(0, 8));
			setUpcomingEvents(upcoming.slice(0, 6));
			setAlertProducts(alerts.slice(0, 5));
			setRecentLogs(Array.isArray(allLogs) ? allLogs.slice(0, 20) : []);
			setStats({
				todaySales: todaySales.length,
				todayRevenue: completedToday.reduce(
					(s, sale) => s + sale.totalTTC,
					0,
				),
				weekSales: weekSales.length,
				weekRevenue: completedWeek.reduce(
					(s, sale) => s + sale.totalTTC,
					0,
				),
				newClientsThisWeek: newClientsWeek.length,
				pendingTasks: pendingTasks.length,
				upcomingEventsCount: upcoming.length,
				stockAlerts: alerts.length,
			});
		} catch {
			showToast("Erreur de chargement", "error");
		} finally {
			setLoading(false);
		}
	}, [showToast, user?.id]);

	useEffect(() => {
		load();
	}, [load]);

	if (loading) {
		return (
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					minHeight: "60vh",
				}}>
				<div
					style={{ textAlign: "center", color: "var(--text-muted)" }}>
					<div
						style={{
							width: "40px",
							height: "40px",
							border: "3px solid var(--border-color)",
							borderTopColor: "var(--accent)",
							borderRadius: "50%",
							animation: "spin 0.8s linear infinite",
							margin: "0 auto 1rem",
						}}
					/>
					<p>Chargement de votre espace...</p>
					<style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
				</div>
			</div>
		);
	}

	// Build notifications / "what you missed"
	const notifications: {
		id: string;
		type: string;
		icon: React.ReactNode;
		title: string;
		description: string;
		time: string;
		link?: string;
		color: string;
		priority: number;
	}[] = [];

	alertProducts.forEach((p) => {
		notifications.push({
			id: `stock-${p.id}`,
			type: "stock",
			icon: (
				<svg
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2">
					<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
					<line x1="12" y1="9" x2="12" y2="13" />
					<line x1="12" y1="17" x2="12.01" y2="17" />
				</svg>
			),
			title: `Stock critique : ${p.name}`,
			description: `Plus que ${p.totalStock} en stock (seuil: ${p.alertThreshold})`,
			time: "Maintenant",
			link: "/products",
			color: "var(--danger)",
			priority: 1,
		});
	});

	recentClients.forEach((c) => {
		notifications.push({
			id: `client-${c.id}`,
			type: "clients",
			icon: (
				<svg
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2">
					<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
					<circle cx="8.5" cy="7" r="4" />
					<line x1="20" y1="8" x2="20" y2="14" />
					<line x1="23" y1="11" x2="17" y2="11" />
				</svg>
			),
			title: `Nouveau client : ${c.name}`,
			description: c.company ? `${c.company} - ${c.status}` : c.status,
			time: timeAgo(c.createdAt),
			link: "/clients",
			color: "#2e4a8a",
			priority: 2,
		});
	});

	recentSales.slice(0, 6).forEach((s) => {
		notifications.push({
			id: `sale-${s.id}`,
			type: "sales",
			icon: (
				<svg
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2">
					<circle cx="9" cy="21" r="1" />
					<circle cx="20" cy="21" r="1" />
					<path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
				</svg>
			),
			title: `Vente ${s.status === "completed" ? "finalisée" : s.status === "cancelled" ? "annulée" : "en attente"} : ${formatCurrency(s.totalTTC)}`,
			description: `${s.product?.name || "Produit"} - ${s.seller?.name || "Vendeur"} ${s.client?.name ? `pour ${s.client.name}` : ""}`,
			time: timeAgo(s.date),
			link: "/sales",
			color:
				s.status === "completed"
					? "var(--success)"
					: s.status === "cancelled"
						? "var(--danger)"
						: "var(--warning)",
			priority: s.status === "completed" ? 3 : 2,
		});
	});

	notifications.sort((a, b) => a.priority - b.priority);

	const filteredNotifications =
		activeSection === "all"
			? notifications
			: notifications.filter((n) => n.type === activeSection);

	const filterTabs = [
		{ key: "all", label: "Tout", count: notifications.length },
		{
			key: "stock",
			label: "Stock",
			count: notifications.filter((n) => n.type === "stock").length,
		},
		{
			key: "sales",
			label: "Ventes",
			count: notifications.filter((n) => n.type === "sales").length,
		},
		{
			key: "clients",
			label: "Clients",
			count: notifications.filter((n) => n.type === "clients").length,
		},
	].filter((t) => t.count > 0 || t.key === "all");

	return (
		<div>
			{/* Detail modal for notification items */}
			{detailModal && (
				<div
					className="modal-overlay"
					onClick={() => setDetailModal(null)}>
					<div
						className="modal-content"
						style={{ maxWidth: 480 }}
						onClick={(e) => e.stopPropagation()}>
						<div className="modal-header">
							<h3 style={{ margin: 0, fontSize: "1rem" }}>
								{detailModal.type === "stock" && "Alerte stock"}
								{detailModal.type === "client" &&
									"Nouveau client"}
								{detailModal.type === "sale" && "Détail vente"}
							</h3>
							<button
								className="btn-icon"
								onClick={() => setDetailModal(null)}>
								<svg
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2">
									<line x1="18" y1="6" x2="6" y2="18" />
									<line x1="6" y1="6" x2="18" y2="18" />
								</svg>
							</button>
						</div>
						<div
							className="modal-body"
							style={{ fontSize: "0.88rem" }}>
							{detailModal.type === "stock" && (() => {
								const p = detailModal.data as ProductWithStock;
								return (
									<div
										style={{
											display: "flex",
											flexDirection: "column",
											gap: "0.6rem",
										}}>
										<div
											style={{
												padding: "0.75rem",
												background: "var(--danger-light, #fee2e2)",
												borderRadius: "8px",
												borderLeft: "3px solid var(--danger)",
												color: "var(--danger)",
												fontWeight: 600,
												fontSize: "0.85rem",
											}}>
											Stock critique
										</div>
										<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
											{[
												["Produit", p.name],
												["Stock actuel", String(p.totalStock)],
												["Seuil d'alerte", String(p.alertThreshold)],
												["Catégorie", p.category || "—"],
											].map(([label, value]) => (
												<div key={label} style={{ padding: "0.6rem", background: "var(--bg-alt)", borderRadius: "6px" }}>
													<div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.2rem" }}>{label}</div>
													<div style={{ fontWeight: 600 }}>{value}</div>
												</div>
											))}
										</div>
									</div>
								);
							})()}
							{detailModal.type === "client" && (() => {
								const c = detailModal.data as Client;
								return (
									<div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
										<div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem", background: "var(--bg-alt)", borderRadius: "8px" }}>
											<div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: "1.1rem" }}>
												{c.name.charAt(0).toUpperCase()}
											</div>
											<div>
												<div style={{ fontWeight: 700 }}>{c.name}</div>
												{c.company && <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{c.company}</div>}
											</div>
											<span className={`badge badge-${c.status === "permanent" ? "success" : c.status === "récurrent" ? "primary" : c.status === "inactif" ? "danger" : "light"}`} style={{ marginLeft: "auto" }}>{c.status}</span>
										</div>
										<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
											{[
												["Email", c.email || "—"],
												["Téléphone", c.phone || "—"],
												["Client depuis", new Date(c.createdAt).toLocaleDateString("fr-FR")],
											].map(([label, value]) => (
												<div key={label} style={{ padding: "0.6rem", background: "var(--bg-alt)", borderRadius: "6px" }}>
													<div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.2rem" }}>{label}</div>
													<div style={{ fontWeight: 500 }}>{value}</div>
												</div>
											))}
										</div>
									</div>
								);
							})()}
							{detailModal.type === "sale" && (() => {
								const s = detailModal.data as Sale;
								return (
									<div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
										<div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
											<span className={`badge ${s.status === "completed" ? "badge-success" : s.status === "cancelled" ? "badge-danger" : "badge-warning"}`}>
												{s.status === "completed" ? "Finalisée" : s.status === "cancelled" ? "Annulée" : "Différée"}
											</span>
											<span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{s.platform}</span>
											<span style={{ marginLeft: "auto", fontWeight: 700, color: "var(--accent)", fontSize: "1.1rem" }}>
												{s.totalTTC.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
											</span>
										</div>
										<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
											{[
												["Produit", s.product?.name || "—"],
												["Quantité", String(s.quantity)],
												["Prix HT", s.unitPriceHT.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })],
												["Prix TTC", s.unitPriceTTC.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })],
												["Vendeur", s.seller?.name || "—"],
												["Client", s.client?.name || "—"],
												["Date", new Date(s.date).toLocaleDateString("fr-FR")],
											].map(([label, value]) => (
												<div key={label} style={{ padding: "0.6rem", background: "var(--bg-alt)", borderRadius: "6px" }}>
													<div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.2rem" }}>{label}</div>
													<div style={{ fontWeight: 500 }}>{value}</div>
												</div>
											))}
										</div>
									</div>
								);
							})()}
						</div>
						<div className="modal-footer">
							<Link
								href={detailModal.type === "stock" ? "/products" : detailModal.type === "client" ? "/clients" : "/sales"}
								className="btn-primary btn-sm"
								onClick={() => setDetailModal(null)}>
								Voir la page
							</Link>
							<button className="btn-secondary btn-sm" onClick={() => setDetailModal(null)}>
								Fermer
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Welcome header */}
			<div
				style={{
					padding: "1.5rem 1.75rem",
					background: "var(--card-bg)",
					borderRadius: "14px",
					border: "1.5px solid var(--border-color)",
					marginBottom: "1.5rem",
					boxShadow: "var(--manga-shadow)",
				}}>
				<h1
					style={{
						margin: "0 0 0.35rem",
						fontSize: "1.4rem",
						lineHeight: 1.2,
					}}>
					{getGreeting()},{" "}
					{user?.name?.split(" ")[0] || "Utilisateur"}
				</h1>
				<p
					style={{
						margin: 0,
						fontSize: "0.88rem",
						color: "var(--text-secondary)",
						lineHeight: 1.5,
					}}>
					Voici ce qui s&apos;est passé depuis votre dernière visite.
				</p>
			</div>

			{/* Main grid */}
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "1fr 340px",
					gap: "1.25rem",
					alignItems: "start",
				}}>
				{/* LEFT: Activity feed */}
				<div>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							marginBottom: "1rem",
							gap: "1rem",
						}}>
						<h2
							style={{
								margin: 0,
								fontSize: "1.05rem",
								fontWeight: 700,
								display: "flex",
								alignItems: "center",
								gap: "0.5rem",
							}}>
							<svg
								width="18"
								height="18"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2">
								<polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
							</svg>
							Ce que vous avez manqué
						</h2>
						<div
							style={{
								display: "flex",
								gap: "0.3rem",
								background: "var(--bg-alt)",
								borderRadius: "8px",
								padding: "0.2rem",
							}}>
							{filterTabs.map((tab) => (
								<button
									key={tab.key}
									onClick={() => setActiveSection(tab.key)}
									style={{
										padding: "0.3rem 0.7rem",
										borderRadius: "6px",
										border: "none",
										background:
											activeSection === tab.key
												? "var(--card-bg)"
												: "transparent",
										color:
											activeSection === tab.key
												? "var(--accent)"
												: "var(--text-muted)",
										fontWeight:
											activeSection === tab.key
												? 700
												: 400,
										fontSize: "0.78rem",
										cursor: "pointer",
										transition: "all 0.15s",
										fontFamily: "inherit",
									}}>
									{tab.label}
									{tab.count > 0 && (
										<span
											style={{
												marginLeft: "0.35rem",
												fontSize: "0.68rem",
												background:
													activeSection === tab.key
														? "var(--accent-light)"
														: "var(--bg-alt)",
												color:
													activeSection === tab.key
														? "var(--accent)"
														: "var(--text-muted)",
												padding: "0.1rem 0.35rem",
												borderRadius: "4px",
												fontWeight: 600,
											}}>
											{tab.count}
										</span>
									)}
								</button>
							))}
						</div>
					</div>

					{filteredNotifications.length === 0 ? (
						<div
							className="card"
							style={{
								textAlign: "center",
								padding: "2.5rem",
								color: "var(--text-muted)",
							}}>
							<svg
								width="40"
								height="40"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="1.5"
								style={{
									margin: "0 auto 0.75rem",
									display: "block",
									opacity: 0.4,
								}}>
								<polyline points="9 11 12 14 22 4" />
								<path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
							</svg>
							<p style={{ fontWeight: 600, fontSize: "0.9rem" }}>
								Rien à signaler
							</p>
							<p style={{ fontSize: "0.82rem" }}>
								Tout est en ordre !
							</p>
						</div>
					) : (
						<div
							style={{
								display: "flex",
								flexDirection: "column",
								gap: "0.5rem",
							}}>
							{filteredNotifications.map((notif) => (
								<button
									key={notif.id}
									onClick={() => {
										if (notif.type === "stock") {
											const p = alertProducts.find((p) => `stock-${p.id}` === notif.id);
											if (p) setDetailModal({ type: "stock", data: p });
										} else if (notif.type === "clients") {
											const c = recentClients.find((c) => `client-${c.id}` === notif.id);
											if (c) setDetailModal({ type: "client", data: c });
										} else if (notif.type === "sales") {
											const s = recentSales.find((s) => `sale-${s.id}` === notif.id);
											if (s) setDetailModal({ type: "sale", data: s });
										}
									}}
									style={{
										display: "flex",
										alignItems: "flex-start",
										gap: "0.85rem",
										padding: "0.9rem 1rem",
										background: "var(--card-bg)",
										border: "1.5px solid var(--border-color)",
										borderRadius: "10px",
										textDecoration: "none",
										color: "inherit",
										cursor: "pointer",
										transition: "all 0.15s ease",
										borderLeft: `3px solid ${notif.color}`,
										textAlign: "left",
										width: "100%",
										fontFamily: "inherit",
									}}
									onMouseEnter={(e) => {
										e.currentTarget.style.transform = "scale(1.01)";
										e.currentTarget.style.boxShadow = "var(--shadow-md)";
									}}
									onMouseLeave={(e) => {
										e.currentTarget.style.transform = "none";
										e.currentTarget.style.boxShadow = "none";
									}}>
									<div
										style={{
											width: "40px",
											height: "40px",
											minWidth: "40px",
											borderRadius: "10px",
											background: `${notif.color}18`,
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											color: notif.color,
											flexShrink: 0,
										}}>
										{notif.icon}
									</div>
									<div style={{ flex: 1, minWidth: 0 }}>
										<div
											style={{
												fontWeight: 600,
												fontSize: "0.88rem",
												color: "var(--text)",
												marginBottom: "0.2rem",
											}}>
											{notif.title}
										</div>
										<div
											style={{
												fontSize: "0.78rem",
												color: "var(--text-secondary)",
												overflow: "hidden",
												textOverflow: "ellipsis",
												whiteSpace: "nowrap",
											}}>
											{notif.description}
										</div>
										<div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
											{notif.time}
										</div>
									</div>
									<span style={{ fontSize: "0.75rem", color: "var(--accent)", fontWeight: 600, flexShrink: 0, alignSelf: "center" }}>
										Voir →
									</span>
								</button>
							))}
						</div>
					)}

					{/* Activity log */}
					<div style={{ marginTop: "1.5rem" }}>
						<h2
							style={{
								margin: "0 0 0.75rem",
								fontSize: "0.95rem",
								fontWeight: 700,
								display: "flex",
								alignItems: "center",
								gap: "0.5rem",
							}}>
							<svg
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2">
								<circle cx="12" cy="12" r="10" />
								<polyline points="12 6 12 12 16 14" />
							</svg>
							{recentLogs.length > 0
								? `En votre absence, il y a eu ${recentLogs.length} action${recentLogs.length > 1 ? "s" : ""}`
								: "Aucune nouvelle activité"}
						</h2>
						<div
							className="card"
							style={{ padding: 0, overflow: "hidden" }}>
							{recentLogs.slice(0, 10).map((log, i) => (
								<div
									key={log.id}
									style={{
										display: "flex",
										alignItems: "center",
										gap: "0.75rem",
										padding: "0.65rem 1rem",
										borderBottom:
											i < 9
												? "1px solid var(--border-color)"
												: "none",
									}}>
									<div
										style={{
											width: "6px",
											height: "6px",
											borderRadius: "50%",
											background:
												MODULE_COLORS[log.module] ||
												"var(--text-muted)",
											flexShrink: 0,
										}}
									/>
									<div style={{ flex: 1, minWidth: 0 }}>
										<span
											style={{
												fontSize: "0.84rem",
												fontWeight: 500,
											}}>
											{log.userName || "Système"}
										</span>
										<span
											style={{
												fontSize: "0.84rem",
												color: "var(--text-secondary)",
												marginLeft: "0.35rem",
											}}>
											{log.action}
										</span>
										{log.details && (
											<span
												style={{
													fontSize: "0.78rem",
													color: "var(--text-muted)",
													marginLeft: "0.35rem",
												}}>
												{" "}
												— {log.details}
											</span>
										)}
									</div>
									<span
										style={{
											fontSize: "0.7rem",
											color: "var(--text-muted)",
											whiteSpace: "nowrap",
											flexShrink: 0,
										}}>
										{timeAgo(log.timestamp)}
									</span>
								</div>
							))}
							{recentLogs.length > 10 && (
								<Link
									href="/logs"
									style={{
										display: "block",
										textAlign: "center",
										padding: "0.65rem",
										fontSize: "0.82rem",
										color: "var(--accent)",
										fontWeight: 600,
										textDecoration: "none",
										borderTop:
											"1px solid var(--border-color)",
									}}>
									Voir tout le journal
								</Link>
							)}
						</div>
					</div>
				</div>

				{/* RIGHT sidebar */}
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "1rem",
					}}>
					{/* My Tasks */}
					<div
						className="card"
						style={{ padding: 0, overflow: "hidden" }}>
						<div
							style={{
								padding: "0.85rem 1.1rem",
								borderBottom: "1px solid var(--border-color)",
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
							}}>
							<h3
								style={{
									margin: 0,
									fontSize: "0.88rem",
									fontWeight: 700,
									display: "flex",
									alignItems: "center",
									gap: "0.5rem",
								}}>
								<svg
									width="14"
									height="14"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2">
									<polyline points="9 11 12 14 22 4" />
									<path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
								</svg>
								Mes tâches
							</h3>
							<span
								className="badge badge-primary"
								style={{ fontSize: "0.68rem" }}>
								{stats.pendingTasks}
							</span>
						</div>
						{myTasks.length === 0 ? (
							<div
								style={{
									padding: "1.5rem",
									textAlign: "center",
									color: "var(--text-muted)",
									fontSize: "0.82rem",
								}}>
								Aucune tâche en attente
							</div>
						) : (
							<div>
								{myTasks.slice(0, 5).map((t, i) => (
									<div
										key={t.id}
										style={{
											display: "flex",
											alignItems: "center",
											gap: "0.6rem",
											padding: "0.6rem 1.1rem",
											borderBottom:
												i <
												Math.min(myTasks.length, 5) - 1
													? "1px solid var(--border-color)"
													: "none",
										}}>
										<div
											style={{
												width: "10px",
												height: "10px",
												borderRadius: "3px",
												flexShrink: 0,
												background:
													t.priority === "high"
														? "var(--danger)"
														: t.priority ===
															  "medium"
															? "var(--warning)"
															: "var(--border-color)",
											}}
										/>
										<div style={{ flex: 1, minWidth: 0 }}>
											<div
												style={{
													fontSize: "0.84rem",
													fontWeight: 500,
													overflow: "hidden",
													textOverflow: "ellipsis",
													whiteSpace: "nowrap",
												}}>
												{t.title}
											</div>
										</div>
										<span
											className={`badge ${t.priority === "high" ? "badge-danger" : t.priority === "medium" ? "badge-warning" : "badge-light"}`}
											style={{ fontSize: "0.62rem" }}>
											{t.priority === "high"
												? "Urgent"
												: t.priority === "medium"
													? "Moyen"
													: "Normal"}
										</span>
									</div>
								))}
								{myTasks.length > 5 && (
									<Link
										href="/tasks"
										style={{
											display: "block",
											textAlign: "center",
											padding: "0.5rem",
											fontSize: "0.78rem",
											color: "var(--accent)",
											fontWeight: 600,
											textDecoration: "none",
										}}>
										+{myTasks.length - 5} autres
									</Link>
								)}
							</div>
						)}
					</div>

					{/* Upcoming Events */}
					<div
						className="card"
						style={{ padding: 0, overflow: "hidden" }}>
						<div
							style={{
								padding: "0.85rem 1.1rem",
								borderBottom: "1px solid var(--border-color)",
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
							}}>
							<h3
								style={{
									margin: 0,
									fontSize: "0.88rem",
									fontWeight: 700,
									display: "flex",
									alignItems: "center",
									gap: "0.5rem",
								}}>
								<svg
									width="14"
									height="14"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2">
									<rect
										x="3"
										y="4"
										width="18"
										height="18"
										rx="2"
										ry="2"
									/>
									<line x1="16" y1="2" x2="16" y2="6" />
									<line x1="8" y1="2" x2="8" y2="6" />
									<line x1="3" y1="10" x2="21" y2="10" />
								</svg>
								À venir
							</h3>
							<span
								className="badge badge-warning"
								style={{ fontSize: "0.68rem" }}>
								{stats.upcomingEventsCount}
							</span>
						</div>
						{upcomingEvents.length === 0 ? (
							<div
								style={{
									padding: "1.5rem",
									textAlign: "center",
									color: "var(--text-muted)",
									fontSize: "0.82rem",
								}}>
								Aucun événement à venir
							</div>
						) : (
							<div>
								{upcomingEvents.slice(0, 5).map((e, i) => {
									const d = new Date(e.date);
									const isToday =
										d.toDateString() ===
										new Date().toDateString();
									return (
										<div
											key={e.id}
											style={{
												display: "flex",
												alignItems: "flex-start",
												gap: "0.65rem",
												padding: "0.6rem 1.1rem",
												borderBottom:
													i <
													Math.min(
														upcomingEvents.length,
														5,
													) -
														1
														? "1px solid var(--border-color)"
														: "none",
											}}>
											<div
												style={{
													width: "38px",
													minWidth: "38px",
													textAlign: "center",
													padding: "0.25rem 0",
													background: isToday
														? "var(--accent-light)"
														: "var(--bg-alt)",
													borderRadius: "7px",
													border: isToday
														? "1px solid var(--accent)"
														: "1px solid var(--border-color)",
												}}>
												<div
													style={{
														fontSize: "0.95rem",
														fontWeight: 700,
														color: isToday
															? "var(--accent)"
															: "var(--text)",
														lineHeight: 1.2,
													}}>
													{d.getDate()}
												</div>
												<div
													style={{
														fontSize: "0.6rem",
														color: "var(--text-muted)",
														textTransform:
															"uppercase",
													}}>
													{d.toLocaleDateString(
														"fr-FR",
														{ month: "short" },
													)}
												</div>
											</div>
											<div
												style={{
													flex: 1,
													minWidth: 0,
												}}>
												<div
													style={{
														fontSize: "0.84rem",
														fontWeight: 500,
														overflow: "hidden",
														textOverflow:
															"ellipsis",
														whiteSpace: "nowrap",
													}}>
													{e.title}
												</div>
												<div
													style={{
														fontSize: "0.72rem",
														color: "var(--text-muted)",
														display: "flex",
														alignItems: "center",
														gap: "0.35rem",
													}}>
													<span
														style={{
															width: "6px",
															height: "6px",
															borderRadius: "2px",
															background:
																e.type ===
																"meeting"
																	? "#2e4a8a"
																	: e.type ===
																		  "deadline"
																		? "#c0392b"
																		: "#b8923a",
														}}
													/>
													{e.type === "meeting"
														? "Réunion"
														: e.type === "deadline"
															? "Échéance"
															: e.type ===
																  "reminder"
																? "Rappel"
																: "Autre"}
													{isToday && (
														<span
															style={{
																color: "var(--accent)",
																fontWeight: 600,
															}}>
															{" "}
															— Aujourd&apos;hui
														</span>
													)}
												</div>
											</div>
										</div>
									);
								})}
								<Link
									href="/calendar"
									style={{
										display: "block",
										textAlign: "center",
										padding: "0.5rem",
										fontSize: "0.78rem",
										color: "var(--accent)",
										fontWeight: 600,
										textDecoration: "none",
										borderTop:
											"1px solid var(--border-color)",
									}}>
									Voir le calendrier
								</Link>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
