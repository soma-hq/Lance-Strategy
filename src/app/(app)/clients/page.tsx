"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import api from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { useConfirm } from "@/hooks/useConfirm";
import { canDo } from "@/lib/rbac";
import type { Client, Sale } from "@/types";
import {
	ClientStatusLabels,
	ClientStatusBadges,
	SaleStatusLabels,
} from "@/types/constants";

async function downloadInvoice(sale: Sale) {
	const { generateInvoice } = await import("@/lib/generate-invoice");
	generateInvoice(sale);
}

const EUR = (n: number) =>
	n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

const DATE_FR = (d: Date | string) =>
	new Date(d).toLocaleDateString("fr-FR", {
		day: "2-digit",
		month: "long",
		year: "numeric",
	});

const DATE_FR_SHORT = (d: Date | string) =>
	new Date(d).toLocaleDateString("fr-FR");

const INITIAL_FORM = {
	name: "",
	email: "",
	phone: "",
	company: "",
	status: "one-shot",
	notes: "",
};

type DetailTab = "profil" | "factures" | "historique" | "notes";

/* ━━━ Icons ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function IconUsers() {
	return (
		<svg
			width="20"
			height="20"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2">
			<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
			<circle cx="9" cy="7" r="4" />
			<path d="M23 21v-2a4 4 0 0 0-3-3.87" />
			<path d="M16 3.13a4 4 0 0 1 0 7.75" />
		</svg>
	);
}

function IconPlus() {
	return (
		<svg
			width="14"
			height="14"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2.5">
			<line x1="12" y1="5" x2="12" y2="19" />
			<line x1="5" y1="12" x2="19" y2="12" />
		</svg>
	);
}

function IconClose() {
	return (
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
	);
}

function IconSearch() {
	return (
		<svg
			width="14"
			height="14"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2">
			<circle cx="11" cy="11" r="8" />
			<line x1="21" y1="21" x2="16.65" y2="16.65" />
		</svg>
	);
}

function IconEdit() {
	return (
		<svg
			width="14"
			height="14"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2">
			<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
			<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
		</svg>
	);
}

function IconTrash() {
	return (
		<svg
			width="14"
			height="14"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2">
			<polyline points="3 6 5 6 21 6" />
			<path d="M19 6l-1 14H6L5 6" />
		</svg>
	);
}

function IconTable() {
	return (
		<svg
			width="14"
			height="14"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2">
			<rect x="3" y="3" width="18" height="18" rx="2" />
			<line x1="3" y1="9" x2="21" y2="9" />
			<line x1="3" y1="15" x2="21" y2="15" />
			<line x1="9" y1="3" x2="9" y2="21" />
		</svg>
	);
}

function IconCards() {
	return (
		<svg
			width="14"
			height="14"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2">
			<rect x="3" y="3" width="7" height="7" />
			<rect x="14" y="3" width="7" height="7" />
			<rect x="3" y="14" width="7" height="7" />
			<rect x="14" y="14" width="7" height="7" />
		</svg>
	);
}

function IconDownload() {
	return (
		<svg
			width="13"
			height="13"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2">
			<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
			<polyline points="14 2 14 8 20 8" />
			<line x1="12" y1="13" x2="12" y2="19" />
			<polyline points="9 16 12 19 15 16" />
		</svg>
	);
}

function IconUser() {
	return (
		<svg
			width="15"
			height="15"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2">
			<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
			<circle cx="12" cy="7" r="4" />
		</svg>
	);
}

function IconMail() {
	return (
		<svg
			width="14"
			height="14"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2">
			<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
			<polyline points="22,6 12,13 2,6" />
		</svg>
	);
}

function IconPhone() {
	return (
		<svg
			width="14"
			height="14"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2">
			<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
		</svg>
	);
}

function IconBuilding() {
	return (
		<svg
			width="14"
			height="14"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2">
			<rect x="4" y="2" width="16" height="20" rx="2" />
			<path d="M9 22v-4h6v4" />
			<path d="M8 6h.01M16 6h.01M12 6h.01M8 10h.01M16 10h.01M12 10h.01M8 14h.01M16 14h.01M12 14h.01" />
		</svg>
	);
}

function IconCalendar() {
	return (
		<svg
			width="14"
			height="14"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2">
			<rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
			<line x1="16" y1="2" x2="16" y2="6" />
			<line x1="8" y1="2" x2="8" y2="6" />
			<line x1="3" y1="10" x2="21" y2="10" />
		</svg>
	);
}

function IconSave() {
	return (
		<svg
			width="14"
			height="14"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2">
			<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
			<polyline points="17 21 17 13 7 13 7 21" />
			<polyline points="7 3 7 8 15 8" />
		</svg>
	);
}

function IconShoppingBag() {
	return (
		<svg
			width="14"
			height="14"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2">
			<path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
			<line x1="3" y1="6" x2="21" y2="6" />
			<path d="M16 10a4 4 0 0 1-8 0" />
		</svg>
	);
}

function IconTrendingUp() {
	return (
		<svg
			width="14"
			height="14"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2">
			<polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
			<polyline points="17 6 23 6 23 12" />
		</svg>
	);
}

function IconClock() {
	return (
		<svg
			width="12"
			height="12"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2">
			<circle cx="12" cy="12" r="10" />
			<polyline points="12 6 12 12 16 14" />
		</svg>
	);
}

/* ━━━ Helpers ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function getTotalCA(client: Client): number {
	return (client.sales || [])
		.filter((s: Sale) => s.status === "completed")
		.reduce((sum: number, s: Sale) => sum + s.totalTTC, 0);
}

function getSalesCount(client: Client): number {
	return (client.sales || []).filter((s: Sale) => s.status === "completed")
		.length;
}

function getLastPurchaseDate(client: Client): string | null {
	const completed = (client.sales || [])
		.filter((s: Sale) => s.status === "completed")
		.sort(
			(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
		);
	return completed.length > 0 ? (completed[0].date as string) : null;
}

function getInitials(name: string): string {
	return name
		.split(" ")
		.map((p) => p[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

/* ━━━ Main Component ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

export default function ClientsPage() {
	const { user } = useAuth();
	const { showToast } = useToast();
	const confirm = useConfirm();

	/* ── State ─────────────────────────────────────────────────────────────── */

	const [clients, setClients] = useState<Client[]>([]);
	const [filtered, setFiltered] = useState<Client[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState("all");
	const [viewMode, setViewMode] = useState<"table" | "cards">("cards");

	// Detail modal
	const [selected, setSelected] = useState<Client | null>(null);
	const [detailTab, setDetailTab] = useState<DetailTab>("profil");

	// Create/Edit modal
	const [showFormModal, setShowFormModal] = useState(false);
	const [editMode, setEditMode] = useState(false);
	const [form, setForm] = useState(INITIAL_FORM);
	const [saving, setSaving] = useState(false);

	// Profile edit inside detail modal
	const [editingProfile, setEditingProfile] = useState(false);
	const [profileForm, setProfileForm] = useState(INITIAL_FORM);
	const [savingProfile, setSavingProfile] = useState(false);

	// Notes
	const [notesValue, setNotesValue] = useState("");
	const [savingNotes, setSavingNotes] = useState(false);

	// Invoice date filter
	const [invoiceDateFrom, setInvoiceDateFrom] = useState("");
	const [invoiceDateTo, setInvoiceDateTo] = useState("");

	/** Whether the current user may create a new client record. */
	const canCreate = canDo(user?.role ?? "", "createClient");
	/** Whether the current user may edit an existing client record. */
	const canEdit = canDo(user?.role ?? "", "editClient");
	/** Whether the current user may delete a client record. */
	const canDelete = canDo(user?.role ?? "", "deleteClient");

	/* ── Data loading ──────────────────────────────────────────────────────── */

	const load = useCallback(async () => {
		try {
			const data = await api.get<Client[]>("/clients");
			setClients(data);
		} catch {
			showToast("Erreur de chargement", "error");
		} finally {
			setLoading(false);
		}
	}, [showToast]);

	useEffect(() => {
		load();
	}, [load]);

	/* ── Filtering ─────────────────────────────────────────────────────────── */

	useEffect(() => {
		let result = clients;
		if (search) {
			const q = search.toLowerCase();
			result = result.filter(
				(c) =>
					c.name.toLowerCase().includes(q) ||
					(c.company || "").toLowerCase().includes(q) ||
					(c.email || "").toLowerCase().includes(q),
			);
		}
		if (statusFilter !== "all")
			result = result.filter((c) => c.status === statusFilter);
		setFiltered(result);
	}, [clients, search, statusFilter]);

	/* ── Stats ─────────────────────────────────────────────────────────────── */

	const stats = useMemo(() => {
		const total = clients.length;
		const newThisMonth = clients.filter((c) => {
			const d = new Date(c.createdAt);
			const now = new Date();
			return (
				d.getMonth() === now.getMonth() &&
				d.getFullYear() === now.getFullYear()
			);
		}).length;
		const caTotal = clients.reduce((s, c) => s + getTotalCA(c), 0);
		const avgRevenue = total > 0 ? caTotal / total : 0;
		return { total, newThisMonth, caTotal, avgRevenue };
	}, [clients]);

	/* ── Filtered sales for invoices tab ───────────────────────────────────── */

	const filteredSales = useMemo(() => {
		if (!selected) return [];
		let sales = [...(selected.sales || [])];
		if (invoiceDateFrom) {
			const from = new Date(invoiceDateFrom);
			sales = sales.filter((s) => new Date(s.date) >= from);
		}
		if (invoiceDateTo) {
			const to = new Date(invoiceDateTo);
			to.setHours(23, 59, 59, 999);
			sales = sales.filter((s) => new Date(s.date) <= to);
		}
		return sales.sort(
			(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
		);
	}, [selected, invoiceDateFrom, invoiceDateTo]);

	const filteredSalesTotals = useMemo(() => {
		const completed = filteredSales.filter((s) => s.status === "completed");
		return {
			count: filteredSales.length,
			completedCount: completed.length,
			totalTTC: completed.reduce((sum, s) => sum + s.totalTTC, 0),
			totalHT: completed.reduce((sum, s) => sum + s.totalHT, 0),
		};
	}, [filteredSales]);

	/* ── Sales timeline for historique tab ──────────────────────────────────── */

	const salesTimeline = useMemo(() => {
		if (!selected) return [];
		return [...(selected.sales || [])].sort(
			(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
		);
	}, [selected]);

	/* ── CRUD handlers ─────────────────────────────────────────────────────── */

	const openCreate = () => {
		setEditMode(false);
		setForm(INITIAL_FORM);
		setShowFormModal(true);
	};

	const openEdit = (c: Client) => {
		setEditMode(true);
		setForm({
			name: c.name,
			email: c.email || "",
			phone: c.phone || "",
			company: c.company || "",
			status: c.status,
			notes: c.notes || "",
		});
		setSelected(c);
		setShowFormModal(true);
	};

	const handleSave = async () => {
		if (!form.name) {
			showToast("Le nom est requis", "error");
			return;
		}
		setSaving(true);
		try {
			if (editMode && selected) {
				await api.put(`/clients/${selected.id}`, form);
				showToast("Client modifie", "success");
			} else {
				await api.post("/clients", form);
				showToast("Client cree", "success");
			}
			setShowFormModal(false);
			load();
		} catch (e) {
			showToast((e as Error).message, "error");
		} finally {
			setSaving(false);
		}
	};

	const handleDelete = async (c: Client) => {
		const ok = await confirm({
			title: "Supprimer le client",
			message: `Supprimer "${c.name}" ?`,
			confirmLabel: "Supprimer",
			danger: true,
		});
		if (!ok) return;
		try {
			await api.delete(`/clients/${c.id}`);
			showToast("Client supprime", "success");
			setSelected(null);
			load();
		} catch (e) {
			showToast((e as Error).message, "error");
		}
	};

	/* ── Detail modal open ─────────────────────────────────────────────────── */

	const openDetail = (c: Client) => {
		setSelected(c);
		setDetailTab("profil");
		setEditingProfile(false);
		setNotesValue(c.notes || "");
		setInvoiceDateFrom("");
		setInvoiceDateTo("");
	};

	const closeDetail = () => {
		setSelected(null);
		setEditingProfile(false);
	};

	/* ── Profile edit in detail modal ──────────────────────────────────────── */

	const startEditProfile = () => {
		if (!selected) return;
		setProfileForm({
			name: selected.name,
			email: selected.email || "",
			phone: selected.phone || "",
			company: selected.company || "",
			status: selected.status,
			notes: selected.notes || "",
		});
		setEditingProfile(true);
	};

	const handleSaveProfile = async () => {
		if (!selected) return;
		if (!profileForm.name) {
			showToast("Le nom est requis", "error");
			return;
		}
		setSavingProfile(true);
		try {
			await api.put(`/clients/${selected.id}`, profileForm);
			showToast("Client modifie", "success");
			setEditingProfile(false);
			const data = await api.get<Client[]>("/clients");
			setClients(data);
			const updated = data.find((c) => c.id === selected.id);
			if (updated) setSelected(updated);
		} catch (e) {
			showToast((e as Error).message, "error");
		} finally {
			setSavingProfile(false);
		}
	};

	/* ── Notes save ────────────────────────────────────────────────────────── */

	const handleSaveNotes = async () => {
		if (!selected) return;
		setSavingNotes(true);
		try {
			await api.put(`/clients/${selected.id}`, { notes: notesValue });
			showToast("Notes enregistrees", "success");
			const data = await api.get<Client[]>("/clients");
			setClients(data);
			const updated = data.find((c) => c.id === selected.id);
			if (updated) {
				setSelected(updated);
				setNotesValue(updated.notes || "");
			}
		} catch (e) {
			showToast((e as Error).message, "error");
		} finally {
			setSavingNotes(false);
		}
	};

	/* ━━━ Render ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

	return (
		<div>
			{/* ── Page header ─────────────────────────────────────────────────── */}
			<div className="page-header-box">
				<div className="phb-left">
					<div className="phb-icon">
						<IconUsers />
					</div>
					<div className="phb-text">
						<h1>Clients</h1>
						<p className="page-description">
							Gestion de la clientele
						</p>
					</div>
				</div>
				<div className="page-header-box-actions">
					<div style={{ display: "flex", gap: "0.35rem" }}>
						{(["table", "cards"] as const).map((m) => (
							<button
								key={m}
								className={
									viewMode === m
										? "btn-secondary btn-sm"
										: "btn-icon"
								}
								onClick={() => setViewMode(m)}
								title={
									m === "table" ? "Vue tableau" : "Vue cartes"
								}>
								{m === "table" ? <IconTable /> : <IconCards />}
							</button>
						))}
					</div>
					{canCreate && (
						<button
							className="btn-primary btn-sm"
							onClick={openCreate}>
							<IconPlus />
							Nouveau client
						</button>
					)}
				</div>
			</div>

			{/* ── Stats ───────────────────────────────────────────────────────── */}
			<div
				className="stats-grid"
				style={{
					gridTemplateColumns: "repeat(4,1fr)",
					marginBottom: "1.25rem",
				}}>
				{[
					{
						label: "Total clients",
						value: stats.total,
						icon: <IconUsers />,
						variant: "info",
					},
					{
						label: "Nouveaux ce mois",
						value: stats.newThisMonth,
						icon: <IconCalendar />,
						variant: "warning",
					},
					{
						label: "CA total clients",
						value: EUR(stats.caTotal),
						icon: <IconTrendingUp />,
						variant: "success",
					},
					{
						label: "CA moyen / client",
						value: EUR(stats.avgRevenue),
						icon: <IconShoppingBag />,
						variant: "primary",
					},
				].map((s) => (
					<div key={s.label} className="stat-card">
						<div className="stat-info">
							<div className="stat-value">{s.value}</div>
							<div className="stat-label">{s.label}</div>
						</div>
					</div>
				))}
			</div>

			{/* ── Filters ─────────────────────────────────────────────────────── */}
			<div className="products-controls">
				<div
					style={{
						position: "relative",
						flex: 1,
						maxWidth: "320px",
					}}>
					<span
						style={{
							position: "absolute",
							left: "0.75rem",
							top: "50%",
							transform: "translateY(-50%)",
							color: "var(--text-muted)",
							display: "flex",
						}}>
						<IconSearch />
					</span>
					<input
						className="search-input"
						type="search"
						placeholder="Rechercher par nom, societe, email..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						style={{ paddingLeft: "2.25rem" }}
					/>
				</div>
				<select
					value={statusFilter}
					onChange={(e) => setStatusFilter(e.target.value)}
					style={{
						padding: "0.6rem 0.85rem",
						border: "1.5px solid var(--border-color)",
						borderRadius: "8px",
						background: "var(--card-bg)",
						color: "var(--text)",
						fontSize: "0.875rem",
					}}>
					<option value="all">Tous les statuts</option>
					{Object.entries(ClientStatusLabels).map(([v, l]) => (
						<option key={v} value={v}>
							{l}
						</option>
					))}
				</select>
			</div>

			{/* ── Content ─────────────────────────────────────────────────────── */}
			{loading ? (
				<div className="empty-state">
					<p>Chargement...</p>
				</div>
			) : viewMode === "table" ? (
				/* ── Table View ─────────────────────────────────────────────── */
				<div
					className="card"
					style={{ padding: 0, overflow: "hidden" }}>
					{filtered.length === 0 ? (
						<div className="empty-state">
							<h4>Aucun client trouve</h4>
						</div>
					) : (
						<div style={{ overflowX: "auto" }}>
							<table className="data-table">
								<thead>
									<tr>
										<th>Client</th>
										<th>Statut</th>
										<th>Contact</th>
										<th style={{ textAlign: "right" }}>
											CA total
										</th>
										<th style={{ textAlign: "center" }}>
											Achats
										</th>
										<th>Dernier achat</th>
										<th>Actions</th>
									</tr>
								</thead>
								<tbody>
									{filtered.map((c) => {
										const lastPurchase =
											getLastPurchaseDate(c);
										return (
											<tr
												key={c.id}
												onClick={() => openDetail(c)}
												style={{ cursor: "pointer" }}>
												<td>
													<div
														style={{
															display: "flex",
															alignItems:
																"center",
															gap: "0.65rem",
														}}>
														<div
															style={{
																width: "32px",
																height: "32px",
																borderRadius:
																	"50%",
																background:
																	"var(--accent)",
																color: "#fff",
																display: "flex",
																alignItems:
																	"center",
																justifyContent:
																	"center",
																fontSize:
																	"0.7rem",
																fontWeight: 700,
																flexShrink: 0,
															}}>
															{getInitials(
																c.name,
															)}
														</div>
														<div>
															<div
																style={{
																	fontWeight: 600,
																	fontSize:
																		"0.9rem",
																}}>
																{c.name}
															</div>
															<div
																style={{
																	fontSize:
																		"0.78rem",
																	color: "var(--text-muted)",
																}}>
																{c.company ||
																	"Particulier"}
															</div>
														</div>
													</div>
												</td>
												<td>
													<span
														className={`badge ${ClientStatusBadges[c.status] || "badge-light"}`}>
														{ClientStatusLabels[
															c.status
														] || c.status}
													</span>
												</td>
												<td>
													<div
														style={{
															fontSize: "0.82rem",
															color: "var(--text-secondary)",
														}}>
														{c.email && (
															<div>{c.email}</div>
														)}
														{c.phone && (
															<div
																style={{
																	color: "var(--text-muted)",
																	fontSize:
																		"0.78rem",
																}}>
																{c.phone}
															</div>
														)}
														{!c.email &&
															!c.phone &&
															"---"}
													</div>
												</td>
												<td
													style={{
														textAlign: "right",
														fontWeight: 700,
														color: "var(--success)",
													}}>
													{EUR(getTotalCA(c))}
												</td>
												<td
													style={{
														textAlign: "center",
														fontWeight: 600,
													}}>
													{getSalesCount(c)}
												</td>
												<td
													style={{
														fontSize: "0.82rem",
														color: "var(--text-secondary)",
													}}>
													{lastPurchase
														? DATE_FR_SHORT(
																lastPurchase,
															)
														: "---"}
												</td>
												<td>
													<div
														style={{
															display: "flex",
															gap: "0.4rem",
														}}>
														{canEdit && (
															<button
																className="btn-icon"
																onClick={(
																	e,
																) => {
																	e.stopPropagation();
																	openEdit(c);
																}}
																title="Modifier">
																<IconEdit />
															</button>
														)}
														{canDelete && (
															<button
																className="btn-icon delete"
																onClick={(
																	e,
																) => {
																	e.stopPropagation();
																	handleDelete(
																		c,
																	);
																}}
																title="Supprimer">
																<IconTrash />
															</button>
														)}
													</div>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					)}
				</div>
			) : (
				/* ── Cards View ─────────────────────────────────────────────── */
				<div
					style={{
						display: "grid",
						gridTemplateColumns:
							"repeat(auto-fill, minmax(300px, 1fr))",
						gap: "1rem",
					}}>
					{filtered.length === 0 ? (
						<div
							className="empty-state"
							style={{ gridColumn: "1 / -1" }}>
							<h4>Aucun client trouve</h4>
						</div>
					) : (
						filtered.map((c) => {
							const totalCA = getTotalCA(c);
							const salesCount = getSalesCount(c);
							const lastPurchase = getLastPurchaseDate(c);
							return (
								<div
									key={c.id}
									className="card"
									onClick={() => openDetail(c)}
									style={{
										cursor: "pointer",
										transition:
											"transform 0.15s, box-shadow 0.15s",
										position: "relative",
									}}
									onMouseEnter={(e) => {
										(
											e.currentTarget as HTMLDivElement
										).style.transform = "translateY(-2px)";
										(
											e.currentTarget as HTMLDivElement
										).style.boxShadow =
											"0 4px 20px rgba(0,0,0,0.08)";
									}}
									onMouseLeave={(e) => {
										(
											e.currentTarget as HTMLDivElement
										).style.transform = "";
										(
											e.currentTarget as HTMLDivElement
										).style.boxShadow = "";
									}}>
									{/* Card header */}
									<div
										style={{
											display: "flex",
											justifyContent: "space-between",
											alignItems: "flex-start",
											marginBottom: "0.85rem",
										}}>
										<div
											style={{
												display: "flex",
												alignItems: "center",
												gap: "0.65rem",
											}}>
											<div
												style={{
													width: "40px",
													height: "40px",
													borderRadius: "50%",
													background: "var(--accent)",
													color: "#fff",
													display: "flex",
													alignItems: "center",
													justifyContent: "center",
													fontSize: "0.8rem",
													fontWeight: 700,
													flexShrink: 0,
												}}>
												{getInitials(c.name)}
											</div>
											<div>
												<div
													style={{
														fontWeight: 700,
														fontSize: "0.95rem",
														color: "var(--text)",
													}}>
													{c.name}
												</div>
												<div
													style={{
														fontSize: "0.8rem",
														color: "var(--text-muted)",
													}}>
													{c.company || "Particulier"}
												</div>
											</div>
										</div>
										<span
											className={`badge ${ClientStatusBadges[c.status] || "badge-light"}`}>
											{ClientStatusLabels[c.status] ||
												c.status}
										</span>
									</div>

									{/* Contact info */}
									<div
										style={{
											fontSize: "0.82rem",
											color: "var(--text-secondary)",
											marginBottom: "0.85rem",
										}}>
										{c.email && (
											<div
												style={{
													display: "flex",
													alignItems: "center",
													gap: "0.4rem",
													marginBottom: "0.2rem",
												}}>
												<IconMail />
												<span>{c.email}</span>
											</div>
										)}
										{c.phone && (
											<div
												style={{
													display: "flex",
													alignItems: "center",
													gap: "0.4rem",
												}}>
												<IconPhone />
												<span>{c.phone}</span>
											</div>
										)}
									</div>

									{/* Metrics */}
									<div
										style={{
											display: "grid",
											gridTemplateColumns: "1fr 1fr 1fr",
											gap: "0.5rem",
											padding: "0.65rem",
											background:
												"var(--bg-alt, rgba(0,0,0,0.02))",
											borderRadius: "8px",
											fontSize: "0.78rem",
										}}>
										<div style={{ textAlign: "center" }}>
											<div
												style={{
													fontWeight: 700,
													fontSize: "0.95rem",
													color: "var(--success)",
												}}>
												{EUR(totalCA)}
											</div>
											<div
												style={{
													color: "var(--text-muted)",
													marginTop: "0.15rem",
												}}>
												CA total
											</div>
										</div>
										<div style={{ textAlign: "center" }}>
											<div
												style={{
													fontWeight: 700,
													fontSize: "0.95rem",
													color: "var(--text)",
												}}>
												{salesCount}
											</div>
											<div
												style={{
													color: "var(--text-muted)",
													marginTop: "0.15rem",
												}}>
												Achats
											</div>
										</div>
										<div style={{ textAlign: "center" }}>
											<div
												style={{
													fontWeight: 700,
													fontSize: "0.82rem",
													color: "var(--text)",
												}}>
												{lastPurchase
													? DATE_FR_SHORT(
															lastPurchase,
														)
													: "---"}
											</div>
											<div
												style={{
													color: "var(--text-muted)",
													marginTop: "0.15rem",
												}}>
												Dernier
											</div>
										</div>
									</div>
								</div>
							);
						})
					)}
				</div>
			)}

			{/* ━━━ Comprehensive Detail Modal ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
			{selected && !showFormModal && (
				<div className="modal-overlay" onClick={closeDetail}>
					<div
						className="modal-content modal-large"
						onClick={(e) => e.stopPropagation()}
						style={{
							maxWidth: "860px",
							maxHeight: "90vh",
							display: "flex",
							flexDirection: "column",
						}}>
						{/* Modal header */}
						<div className="modal-header" style={{ flexShrink: 0 }}>
							<div
								style={{
									display: "flex",
									alignItems: "center",
									gap: "0.75rem",
								}}>
								<div
									style={{
										width: "42px",
										height: "42px",
										borderRadius: "50%",
										background: "var(--accent)",
										color: "#fff",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										fontSize: "0.85rem",
										fontWeight: 700,
										flexShrink: 0,
									}}>
									{getInitials(selected.name)}
								</div>
								<div>
									<h3 style={{ margin: 0, lineHeight: 1.2 }}>
										{selected.name}
									</h3>
									<div
										style={{
											display: "flex",
											alignItems: "center",
											gap: "0.5rem",
											marginTop: "0.2rem",
										}}>
										<span
											style={{
												fontSize: "0.8rem",
												color: "var(--text-muted)",
											}}>
											{selected.company || "Particulier"}
										</span>
										<span
											className={`badge ${ClientStatusBadges[selected.status] || "badge-light"}`}>
											{ClientStatusLabels[
												selected.status
											] || selected.status}
										</span>
									</div>
								</div>
							</div>
							<div
								style={{
									display: "flex",
									alignItems: "center",
									gap: "0.5rem",
								}}>
								{canDelete && (
									<button
										className="btn-danger btn-sm"
										onClick={() => handleDelete(selected)}
										style={{ fontSize: "0.78rem" }}>
										<IconTrash />
										Supprimer
									</button>
								)}
								<button
									className="btn-icon"
									onClick={closeDetail}>
									<IconClose />
								</button>
							</div>
						</div>

						{/* Tabs navigation */}
						<div
							style={{
								display: "flex",
								gap: "0",
								borderBottom: "2px solid var(--border-color)",
								padding: "0 1.25rem",
								flexShrink: 0,
							}}>
							{(
								[
									{
										key: "profil",
										label: "Profil",
										icon: <IconUser />,
									},
									{
										key: "factures",
										label: "Factures",
										icon: <IconDownload />,
									},
									{
										key: "historique",
										label: "Historique ventes",
										icon: <IconShoppingBag />,
									},
									{
										key: "notes",
										label: "Notes",
										icon: <IconEdit />,
									},
								] as {
									key: DetailTab;
									label: string;
									icon: React.ReactNode;
								}[]
							).map((tab) => (
								<button
									key={tab.key}
									onClick={() => {
										setDetailTab(tab.key);
										if (tab.key === "profil")
											setEditingProfile(false);
										if (tab.key === "notes")
											setNotesValue(selected.notes || "");
									}}
									style={{
										display: "flex",
										alignItems: "center",
										gap: "0.4rem",
										padding: "0.75rem 1rem",
										border: "none",
										background: "none",
										cursor: "pointer",
										fontSize: "0.84rem",
										fontWeight:
											detailTab === tab.key ? 700 : 500,
										color:
											detailTab === tab.key
												? "var(--accent)"
												: "var(--text-muted)",
										borderBottom:
											detailTab === tab.key
												? "2px solid var(--accent)"
												: "2px solid transparent",
										marginBottom: "-2px",
										transition:
											"color 0.15s, border-color 0.15s",
									}}>
									{tab.icon}
									{tab.label}
								</button>
							))}
						</div>

						{/* Tab content */}
						<div
							className="modal-body"
							style={{
								flex: 1,
								overflowY: "auto",
								padding: "1.25rem",
							}}>
							{/* ── Profil Tab ─────────────────────────────────────── */}
							{detailTab === "profil" && !editingProfile && (
								<div>
									{/* Quick metrics */}
									<div
										style={{
											display: "grid",
											gridTemplateColumns:
												"repeat(3, 1fr)",
											gap: "0.75rem",
											marginBottom: "1.5rem",
										}}>
										<div
											style={{
												padding: "0.85rem",
												background:
													"var(--bg-alt, rgba(0,0,0,0.02))",
												borderRadius: "10px",
												textAlign: "center",
											}}>
											<div
												style={{
													fontWeight: 700,
													fontSize: "1.15rem",
													color: "var(--success)",
												}}>
												{EUR(getTotalCA(selected))}
											</div>
											<div
												style={{
													fontSize: "0.75rem",
													color: "var(--text-muted)",
													marginTop: "0.25rem",
												}}>
												CA total
											</div>
										</div>
										<div
											style={{
												padding: "0.85rem",
												background:
													"var(--bg-alt, rgba(0,0,0,0.02))",
												borderRadius: "10px",
												textAlign: "center",
											}}>
											<div
												style={{
													fontWeight: 700,
													fontSize: "1.15rem",
													color: "var(--text)",
												}}>
												{getSalesCount(selected)}
											</div>
											<div
												style={{
													fontSize: "0.75rem",
													color: "var(--text-muted)",
													marginTop: "0.25rem",
												}}>
												Nombre d&apos;achats
											</div>
										</div>
										<div
											style={{
												padding: "0.85rem",
												background:
													"var(--bg-alt, rgba(0,0,0,0.02))",
												borderRadius: "10px",
												textAlign: "center",
											}}>
											<div
												style={{
													fontWeight: 700,
													fontSize: "1.15rem",
													color: "var(--text)",
												}}>
												{getLastPurchaseDate(selected)
													? DATE_FR_SHORT(
															getLastPurchaseDate(
																selected,
															)!,
														)
													: "---"}
											</div>
											<div
												style={{
													fontSize: "0.75rem",
													color: "var(--text-muted)",
													marginTop: "0.25rem",
												}}>
												Dernier achat
											</div>
										</div>
									</div>

									{/* Client details grid */}
									<div
										style={{
											display: "grid",
											gridTemplateColumns: "1fr 1fr",
											gap: "1rem",
											marginBottom: "1.5rem",
										}}>
										{[
											{
												icon: <IconUser />,
												label: "Nom complet",
												value: selected.name,
											},
											{
												icon: <IconBuilding />,
												label: "Societe",
												value:
													selected.company || "---",
											},
											{
												icon: <IconMail />,
												label: "Email",
												value: selected.email || "---",
											},
											{
												icon: <IconPhone />,
												label: "Telephone",
												value: selected.phone || "---",
											},
											{
												icon: <IconCalendar />,
												label: "Date de creation",
												value: DATE_FR(
													selected.createdAt,
												),
											},
											{
												icon: <IconClock />,
												label: "Derniere interaction",
												value: getLastPurchaseDate(
													selected,
												)
													? DATE_FR(
															getLastPurchaseDate(
																selected,
															)!,
														)
													: "Aucune vente",
											},
										].map((item, i) => (
											<div
												key={i}
												style={{
													display: "flex",
													alignItems: "flex-start",
													gap: "0.65rem",
													padding: "0.75rem",
													background:
														"var(--card-bg)",
													border: "1px solid var(--border-color)",
													borderRadius: "8px",
												}}>
												<div
													style={{
														color: "var(--accent)",
														marginTop: "0.1rem",
														flexShrink: 0,
													}}>
													{item.icon}
												</div>
												<div>
													<div
														style={{
															fontSize: "0.72rem",
															fontWeight: 700,
															color: "var(--text-muted)",
															textTransform:
																"uppercase",
															letterSpacing:
																"0.05em",
															marginBottom:
																"0.2rem",
														}}>
														{item.label}
													</div>
													<div
														style={{
															fontSize: "0.9rem",
															color: "var(--text)",
															fontWeight: 500,
														}}>
														{item.value}
													</div>
												</div>
											</div>
										))}
									</div>

									{/* Statut */}
									<div
										style={{
											display: "flex",
											alignItems: "center",
											gap: "0.75rem",
											padding: "0.85rem 1rem",
											background:
												"var(--bg-alt, rgba(0,0,0,0.02))",
											borderRadius: "10px",
											marginBottom: "1rem",
										}}>
										<span
											style={{
												fontSize: "0.8rem",
												fontWeight: 600,
												color: "var(--text-secondary)",
											}}>
											Statut actuel :
										</span>
										<span
											className={`badge ${ClientStatusBadges[selected.status] || "badge-light"}`}>
											{ClientStatusLabels[
												selected.status
											] || selected.status}
										</span>
									</div>

									{canEdit && (
										<button
											className="btn-primary btn-sm"
											onClick={startEditProfile}>
											<IconEdit />
											Modifier le profil
										</button>
									)}
								</div>
							)}

							{/* ── Profil Tab (Edit mode) ─────────────────────────── */}
							{detailTab === "profil" && editingProfile && (
								<div>
									<div
										style={{
											display: "grid",
											gridTemplateColumns: "1fr 1fr",
											gap: "0.85rem",
										}}>
										{[
											{
												key: "name",
												label: "Nom *",
												type: "text",
												placeholder: "Nom complet",
											},
											{
												key: "company",
												label: "Societe",
												type: "text",
												placeholder:
													"Nom de la societe",
											},
											{
												key: "email",
												label: "Email",
												type: "email",
												placeholder:
													"email@exemple.com",
											},
											{
												key: "phone",
												label: "Telephone",
												type: "tel",
												placeholder:
													"+33 6 00 00 00 00",
											},
										].map(
											({
												key,
												label,
												type,
												placeholder,
											}) => (
												<div
													key={key}
													className="form-group">
													<label>{label}</label>
													<input
														type={type}
														value={
															profileForm[
																key as keyof typeof profileForm
															]
														}
														onChange={(e) =>
															setProfileForm({
																...profileForm,
																[key]: e.target
																	.value,
															})
														}
														placeholder={
															placeholder
														}
													/>
												</div>
											),
										)}
									</div>
									<div
										className="form-group"
										style={{ marginTop: "0.5rem" }}>
										<label>Statut</label>
										<select
											value={profileForm.status}
											onChange={(e) =>
												setProfileForm({
													...profileForm,
													status: e.target.value,
												})
											}>
											{Object.entries(
												ClientStatusLabels,
											).map(([v, l]) => (
												<option key={v} value={v}>
													{l}
												</option>
											))}
										</select>
									</div>
									<div
										style={{
											display: "flex",
											gap: "0.5rem",
											marginTop: "1rem",
										}}>
										<button
											className="btn-primary btn-sm"
											onClick={handleSaveProfile}
											disabled={savingProfile}>
											<IconSave />
											{savingProfile
												? "Enregistrement..."
												: "Enregistrer"}
										</button>
										<button
											className="btn-secondary btn-sm"
											onClick={() =>
												setEditingProfile(false)
											}>
											Annuler
										</button>
									</div>
								</div>
							)}

							{/* ── Factures Tab ───────────────────────────────────── */}
							{detailTab === "factures" && (
								<div>
									{/* Date filters */}
									<div
										style={{
											display: "flex",
											gap: "0.75rem",
											alignItems: "flex-end",
											marginBottom: "1rem",
											flexWrap: "wrap",
										}}>
										<div
											className="form-group"
											style={{
												marginBottom: 0,
												flex: "0 0 auto",
											}}>
											<label
												style={{ fontSize: "0.75rem" }}>
												Date debut
											</label>
											<input
												type="date"
												value={invoiceDateFrom}
												onChange={(e) =>
													setInvoiceDateFrom(
														e.target.value,
													)
												}
												style={{
													padding: "0.45rem 0.65rem",
													border: "1.5px solid var(--border-color)",
													borderRadius: "6px",
													background:
														"var(--card-bg)",
													color: "var(--text)",
													fontSize: "0.82rem",
												}}
											/>
										</div>
										<div
											className="form-group"
											style={{
												marginBottom: 0,
												flex: "0 0 auto",
											}}>
											<label
												style={{ fontSize: "0.75rem" }}>
												Date fin
											</label>
											<input
												type="date"
												value={invoiceDateTo}
												onChange={(e) =>
													setInvoiceDateTo(
														e.target.value,
													)
												}
												style={{
													padding: "0.45rem 0.65rem",
													border: "1.5px solid var(--border-color)",
													borderRadius: "6px",
													background:
														"var(--card-bg)",
													color: "var(--text)",
													fontSize: "0.82rem",
												}}
											/>
										</div>
										{(invoiceDateFrom || invoiceDateTo) && (
											<button
												className="btn-secondary btn-sm"
												onClick={() => {
													setInvoiceDateFrom("");
													setInvoiceDateTo("");
												}}
												style={{
													marginBottom: "0.1rem",
												}}>
												Reinitialiser
											</button>
										)}
									</div>

									{/* Totals summary */}
									<div
										style={{
											display: "grid",
											gridTemplateColumns:
												"repeat(3, 1fr)",
											gap: "0.65rem",
											marginBottom: "1rem",
										}}>
										<div
											style={{
												padding: "0.7rem",
												background:
													"var(--bg-alt, rgba(0,0,0,0.02))",
												borderRadius: "8px",
												textAlign: "center",
											}}>
											<div
												style={{
													fontWeight: 700,
													color: "var(--text)",
													fontSize: "1rem",
												}}>
												{filteredSalesTotals.count}
											</div>
											<div
												style={{
													fontSize: "0.72rem",
													color: "var(--text-muted)",
												}}>
												Factures
											</div>
										</div>
										<div
											style={{
												padding: "0.7rem",
												background:
													"var(--bg-alt, rgba(0,0,0,0.02))",
												borderRadius: "8px",
												textAlign: "center",
											}}>
											<div
												style={{
													fontWeight: 700,
													color: "var(--success)",
													fontSize: "1rem",
												}}>
												{EUR(
													filteredSalesTotals.totalTTC,
												)}
											</div>
											<div
												style={{
													fontSize: "0.72rem",
													color: "var(--text-muted)",
												}}>
												Total TTC
											</div>
										</div>
										<div
											style={{
												padding: "0.7rem",
												background:
													"var(--bg-alt, rgba(0,0,0,0.02))",
												borderRadius: "8px",
												textAlign: "center",
											}}>
											<div
												style={{
													fontWeight: 700,
													color: "var(--text-secondary)",
													fontSize: "1rem",
												}}>
												{EUR(
													filteredSalesTotals.totalHT,
												)}
											</div>
											<div
												style={{
													fontSize: "0.72rem",
													color: "var(--text-muted)",
												}}>
												Total HT
											</div>
										</div>
									</div>

									{/* Invoices table */}
									{filteredSales.length === 0 ? (
										<div
											style={{
												textAlign: "center",
												padding: "2rem",
												color: "var(--text-muted)",
												fontSize: "0.85rem",
											}}>
											Aucune facture
											{invoiceDateFrom || invoiceDateTo
												? " pour cette periode"
												: ""}
										</div>
									) : (
										<div style={{ overflowX: "auto" }}>
											<table className="data-table">
												<thead>
													<tr>
														<th>Date</th>
														<th>Produit</th>
														<th>Qte</th>
														<th
															style={{
																textAlign:
																	"right",
															}}>
															Total TTC
														</th>
														<th>Statut</th>
														<th
															style={{
																textAlign:
																	"right",
															}}>
															Facture
														</th>
													</tr>
												</thead>
												<tbody>
													{filteredSales.map((s) => (
														<tr key={s.id}>
															<td
																style={{
																	fontSize:
																		"0.82rem",
																}}>
																{DATE_FR_SHORT(
																	s.date,
																)}
															</td>
															<td>
																{(
																	s as Sale & {
																		product?: {
																			name: string;
																		};
																	}
																).product
																	?.name ||
																	"---"}
															</td>
															<td
																style={{
																	textAlign:
																		"center",
																}}>
																{s.quantity}
															</td>
															<td
																style={{
																	textAlign:
																		"right",
																	fontWeight: 600,
																}}>
																{EUR(
																	s.totalTTC,
																)}
															</td>
															<td>
																<span
																	className={`badge badge-${
																		s.status ===
																		"completed"
																			? "success"
																			: s.status ===
																				  "cancelled"
																				? "danger"
																				: "warning"
																	}`}>
																	{SaleStatusLabels[
																		s.status
																	] ||
																		s.status}
																</span>
															</td>
															<td
																style={{
																	textAlign:
																		"right",
																}}>
																{s.status ===
																	"completed" && (
																	<button
																		className="btn-icon"
																		title="Telecharger la facture"
																		onClick={() =>
																			downloadInvoice(
																				s as Sale,
																			)
																		}>
																		<IconDownload />
																	</button>
																)}
															</td>
														</tr>
													))}
												</tbody>
											</table>
										</div>
									)}
								</div>
							)}

							{/* ── Historique ventes Tab ────────────────────────────── */}
							{detailTab === "historique" && (
								<div>
									{salesTimeline.length === 0 ? (
										<div
											style={{
												textAlign: "center",
												padding: "2rem",
												color: "var(--text-muted)",
												fontSize: "0.85rem",
											}}>
											Aucune vente enregistree
										</div>
									) : (
										<div
											style={{
												position: "relative",
												paddingLeft: "1.75rem",
											}}>
											{/* Timeline line */}
											<div
												style={{
													position: "absolute",
													left: "0.5rem",
													top: "0.5rem",
													bottom: "0.5rem",
													width: "2px",
													background:
														"var(--border-color)",
													borderRadius: "1px",
												}}
											/>
											{salesTimeline.map((s, i) => {
												const isCompleted =
													s.status === "completed";
												const isCancelled =
													s.status === "cancelled";
												const dotColor = isCompleted
													? "var(--success)"
													: isCancelled
														? "var(--danger, #e74c3c)"
														: "var(--warning, #f39c12)";
												return (
													<div
														key={s.id}
														style={{
															position:
																"relative",
															marginBottom:
																i <
																salesTimeline.length -
																	1
																	? "1.25rem"
																	: 0,
															paddingBottom:
																i <
																salesTimeline.length -
																	1
																	? "1.25rem"
																	: 0,
															borderBottom:
																i <
																salesTimeline.length -
																	1
																	? "1px solid var(--border-color)"
																	: "none",
														}}>
														{/* Timeline dot */}
														<div
															style={{
																position:
																	"absolute",
																left: "-1.75rem",
																top: "0.35rem",
																width: "10px",
																height: "10px",
																borderRadius:
																	"50%",
																background:
																	dotColor,
																border: "2px solid var(--card-bg)",
																boxShadow: `0 0 0 2px ${dotColor}`,
																zIndex: 1,
															}}
														/>

														{/* Content */}
														<div
															style={{
																display: "flex",
																justifyContent:
																	"space-between",
																alignItems:
																	"flex-start",
																gap: "1rem",
															}}>
															<div
																style={{
																	flex: 1,
																}}>
																<div
																	style={{
																		display:
																			"flex",
																		alignItems:
																			"center",
																		gap: "0.5rem",
																		marginBottom:
																			"0.35rem",
																	}}>
																	<span
																		style={{
																			fontWeight: 600,
																			fontSize:
																				"0.9rem",
																			color: "var(--text)",
																		}}>
																		{(
																			s as Sale & {
																				product?: {
																					name: string;
																				};
																			}
																		)
																			.product
																			?.name ||
																			`Vente #${s.id}`}
																	</span>
																	<span
																		className={`badge badge-${
																			isCompleted
																				? "success"
																				: isCancelled
																					? "danger"
																					: "warning"
																		}`}>
																		{SaleStatusLabels[
																			s
																				.status
																		] ||
																			s.status}
																	</span>
																</div>
																<div
																	style={{
																		display:
																			"flex",
																		gap: "1rem",
																		fontSize:
																			"0.8rem",
																		color: "var(--text-muted)",
																		flexWrap:
																			"wrap",
																	}}>
																	<span
																		style={{
																			display:
																				"flex",
																			alignItems:
																				"center",
																			gap: "0.3rem",
																		}}>
																		<IconCalendar />
																		{DATE_FR(
																			s.date,
																		)}
																	</span>
																	<span>
																		Qte:{" "}
																		{
																			s.quantity
																		}
																	</span>
																	{(
																		s as Sale & {
																			seller?: {
																				name: string;
																			};
																		}
																	).seller
																		?.name && (
																		<span
																			style={{
																				display:
																					"flex",
																				alignItems:
																					"center",
																				gap: "0.3rem",
																			}}>
																			<IconUser />
																			{
																				(
																					s as Sale & {
																						seller?: {
																							name: string;
																						};
																					}
																				)
																					.seller
																					?.name
																			}
																		</span>
																	)}
																</div>
															</div>
															<div
																style={{
																	textAlign:
																		"right",
																	flexShrink: 0,
																}}>
																<div
																	style={{
																		fontWeight: 700,
																		fontSize:
																			"1rem",
																		color: isCompleted
																			? "var(--success)"
																			: isCancelled
																				? "var(--text-muted)"
																				: "var(--warning, #f39c12)",
																		textDecoration:
																			isCancelled
																				? "line-through"
																				: "none",
																	}}>
																	{EUR(
																		s.totalTTC,
																	)}
																</div>
																<div
																	style={{
																		fontSize:
																			"0.72rem",
																		color: "var(--text-muted)",
																	}}>
																	TTC
																</div>
															</div>
														</div>
													</div>
												);
											})}
										</div>
									)}

									{/* Total summary at bottom */}
									{salesTimeline.length > 0 && (
										<div
											style={{
												marginTop: "1.25rem",
												padding: "0.85rem 1rem",
												background:
													"var(--bg-alt, rgba(0,0,0,0.02))",
												borderRadius: "10px",
												display: "flex",
												justifyContent: "space-between",
												alignItems: "center",
											}}>
											<span
												style={{
													fontSize: "0.85rem",
													fontWeight: 600,
													color: "var(--text-secondary)",
												}}>
												{salesTimeline.length} vente
												{salesTimeline.length > 1
													? "s"
													: ""}{" "}
												au total
											</span>
											<span
												style={{
													fontWeight: 700,
													fontSize: "1.05rem",
													color: "var(--success)",
												}}>
												{EUR(getTotalCA(selected))} de
												CA
											</span>
										</div>
									)}
								</div>
							)}

							{/* ── Notes Tab ──────────────────────────────────────── */}
							{detailTab === "notes" && (
								<div>
									<div style={{ marginBottom: "0.75rem" }}>
										<label
											style={{
												display: "block",
												fontSize: "0.78rem",
												fontWeight: 600,
												color: "var(--text-secondary)",
												marginBottom: "0.5rem",
											}}>
											Notes internes sur {selected.name}
										</label>
										<textarea
											value={notesValue}
											onChange={(e) =>
												setNotesValue(e.target.value)
											}
											readOnly={!canEdit}
											rows={12}
											placeholder="Ajoutez des notes sur ce client : preferences, historique des echanges, informations importantes..."
											style={{
												width: "100%",
												padding: "0.85rem",
												border: "1.5px solid var(--border-color)",
												borderRadius: "10px",
												background: "var(--card-bg)",
												color: "var(--text)",
												fontSize: "0.88rem",
												lineHeight: "1.6",
												resize: "vertical",
												minHeight: "200px",
												fontFamily: "inherit",
											}}
										/>
									</div>
									<div
										style={{
											display: "flex",
											alignItems: "center",
											justifyContent: "space-between",
										}}>
										{canEdit ? (
											<button
												className="btn-primary btn-sm"
												onClick={handleSaveNotes}
												disabled={
													savingNotes ||
													notesValue ===
														(selected.notes || "")
												}>
												<IconSave />
												{savingNotes
													? "Enregistrement..."
													: "Enregistrer les notes"}
											</button>
										) : (
											<div />
										)}
										{notesValue !==
											(selected.notes || "") && (
											<span
												style={{
													fontSize: "0.75rem",
													color: "var(--warning, #f39c12)",
													fontStyle: "italic",
												}}>
												Modifications non enregistrees
											</span>
										)}
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
			)}

			{/* ━━━ Create/Edit Form Modal ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
			{showFormModal && (
				<div className="modal-overlay">
					<div
						className="modal-content"
						style={{ maxWidth: "520px" }}>
						<div className="modal-header">
							<h3>
								{editMode
									? "Modifier le client"
									: "Nouveau client"}
							</h3>
							<button
								className="btn-icon"
								onClick={() => setShowFormModal(false)}>
								<IconClose />
							</button>
						</div>
						<div className="modal-body">
							{[
								{
									key: "name",
									label: "Nom *",
									type: "text",
									placeholder: "Nom complet",
								},
								{
									key: "email",
									label: "Email",
									type: "email",
									placeholder: "email@exemple.com",
								},
								{
									key: "phone",
									label: "Telephone",
									type: "tel",
									placeholder: "+33 6 00 00 00 00",
								},
								{
									key: "company",
									label: "Societe",
									type: "text",
									placeholder: "Nom de la societe",
								},
							].map(({ key, label, type, placeholder }) => (
								<div key={key} className="form-group">
									<label>{label}</label>
									<input
										type={type}
										value={form[key as keyof typeof form]}
										onChange={(e) =>
											setForm({
												...form,
												[key]: e.target.value,
											})
										}
										placeholder={placeholder}
									/>
								</div>
							))}
							<div className="form-group">
								<label>Statut</label>
								<select
									value={form.status}
									onChange={(e) =>
										setForm({
											...form,
											status: e.target.value,
										})
									}>
									{Object.entries(ClientStatusLabels).map(
										([v, l]) => (
											<option key={v} value={v}>
												{l}
											</option>
										),
									)}
								</select>
							</div>
							<div className="form-group">
								<label>Notes</label>
								<textarea
									value={form.notes}
									onChange={(e) =>
										setForm({
											...form,
											notes: e.target.value,
										})
									}
									rows={3}
									placeholder="Notes sur le client..."
								/>
							</div>
						</div>
						<div className="modal-footer">
							<button
								className="btn-secondary btn-sm"
								onClick={() => setShowFormModal(false)}>
								Annuler
							</button>
							<button
								className="btn-primary btn-sm"
								onClick={handleSave}
								disabled={saving}>
								{saving
									? "Enregistrement..."
									: editMode
										? "Modifier"
										: "Creer"}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
