"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { useConfirm } from "@/hooks/useConfirm";
import { canDo } from "@/lib/rbac";
import type { User, UserRole, Sale, Client, Task, Project, Event, Log } from "@/types";

/* ─── Constants ─────────────────────────────────────────────────────────── */

type ProfileTab = "apercu" | "ventes" | "clients" | "taches" | "projets" | "calendrier" | "logs";

const ROLE_LABELS: Record<UserRole, string> = {
	admin: "Admin",
	member: "Membre",
	viewer: "Observateur",
	finance: "Finance",
};
const ROLE_BADGE: Record<UserRole, string> = {
	admin: "badge-danger",
	member: "badge-primary",
	viewer: "badge-light",
	finance: "badge-warning",
};

const TASK_STATUS_LABEL: Record<string, string> = {
	en_attente: "A faire",
	en_cours: "En cours",
	realisee: "Termine",
	bloquee: "Bloquee",
	annulee: "Annulee",
};
const TASK_STATUS_BADGE: Record<string, string> = {
	en_attente: "badge-light",
	en_cours: "badge-primary",
	realisee: "badge-success",
	bloquee: "badge-danger",
	annulee: "badge-light",
};
const TASK_PRIORITY_LABEL: Record<string, string> = {
	low: "Faible",
	medium: "Moyen",
	high: "Eleve",
};
const TASK_PRIORITY_BADGE: Record<string, string> = {
	low: "badge-light",
	medium: "badge-warning",
	high: "badge-danger",
};

const PROJECT_STATUS_LABEL: Record<string, string> = {
	active: "Actif",
	paused: "En pause",
	completed: "Termine",
	cancelled: "Annule",
};
const PROJECT_STATUS_BADGE: Record<string, string> = {
	active: "badge-primary",
	paused: "badge-warning",
	completed: "badge-success",
	cancelled: "badge-light",
};

const EVENT_LABELS: Record<string, string> = {
	meeting: "Reunion",
	call_urgent: "Appel urgent",
	call: "Appel",
	reminder: "Rappel",
	personal: "Personnel",
	deadline: "Echeance",
	other: "Autre",
};
const EVENT_BADGE: Record<string, string> = {
	meeting: "badge-primary",
	call_urgent: "badge-danger",
	call: "badge-warning",
	reminder: "badge-light",
	personal: "badge-light",
	deadline: "badge-danger",
	other: "badge-light",
};

const SALE_STATUS_LABEL: Record<string, string> = {
	completed: "Completee",
	cancelled: "Annulee",
	postponed: "En attente",
};
const SALE_STATUS_BADGE: Record<string, string> = {
	completed: "badge-success",
	cancelled: "badge-danger",
	postponed: "badge-warning",
};

const CLIENT_STATUS_LABEL: Record<string, string> = {
	"one-shot": "One-shot",
	"recurrent": "Recurrent",
	"permanent": "Permanent",
	"inactif": "Inactif",
};
const CLIENT_STATUS_BADGE: Record<string, string> = {
	"one-shot": "badge-warning",
	"recurrent": "badge-primary",
	"permanent": "badge-success",
	"inactif": "badge-light",
};

const MODULE_BADGE: Record<string, string> = {
	auth: "badge-primary",
	products: "badge-warning",
	sales: "badge-success",
	users: "badge-danger",
	clients: "badge-info",
	tasks: "badge-primary",
	projects: "badge-warning",
	calendar: "badge-light",
	logs: "badge-light",
};

const PROFILE_TABS: { key: ProfileTab; label: string }[] = [
	{ key: "apercu", label: "Apercu" },
	{ key: "ventes", label: "Ventes" },
	{ key: "clients", label: "Clients" },
	{ key: "taches", label: "Taches" },
	{ key: "projets", label: "Projets" },
	{ key: "calendrier", label: "Calendrier" },
	{ key: "logs", label: "Logs" },
];

const INITIAL_FORM = {
	username: "",
	password: "",
	name: "",
	role: "member" as UserRole,
	avatar: "",
	active: true,
};

/* ─── Helpers ───────────────────────────────────────────────────────────── */

function eur(n: number): string {
	return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

function formatDate(d: string | Date): string {
	return new Date(d).toLocaleDateString("fr-FR", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	});
}

function formatTs(ts: string | Date): string {
	return new Date(ts).toLocaleString("fr-FR", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

function formatDateTime(d: string | Date): string {
	return new Date(d).toLocaleDateString("fr-FR", {
		weekday: "short",
		day: "2-digit",
		month: "long",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

/* ─── Profile Data ──────────────────────────────────────────────────────── */

interface ProfileData {
	sales: Sale[];
	salesTotalCount: number;
	clients: Client[];
	tasks: Task[];
	projects: Project[];
	events: Event[];
	logs: Log[];
	logsTotal: number;
}

/* ─── Main Component ────────────────────────────────────────────────────── */

export default function UsersPage() {
	const { user } = useAuth();
	const { showToast } = useToast();
	const confirm = useConfirm();
	const router = useRouter();


	const [users, setUsers] = useState<User[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [roleFilter, setRoleFilter] = useState<string>("all");
	const [statusFilter, setStatusFilter] = useState<string>("all");

	// Create/Edit modal
	const [showModal, setShowModal] = useState(false);
	const [editMode, setEditMode] = useState(false);
	const [editTarget, setEditTarget] = useState<User | null>(null);
	const [form, setForm] = useState(INITIAL_FORM);
	const [saving, setSaving] = useState(false);

	// Profile modal
	const [profileUser, setProfileUser] = useState<User | null>(null);
	const [profileTab, setProfileTab] = useState<ProfileTab>("apercu");
	const [profileData, setProfileData] = useState<ProfileData | null>(null);
	const [profileLoading, setProfileLoading] = useState(false);

	/* ─── RBAC ────────────────────────────────────────────────────────── */

	/** Whether the current user may create a new user account. */
	const canCreate = canDo(user?.role ?? "", "createUser");
	/** Whether the current user may edit an existing user account. */
	const canEdit = canDo(user?.role ?? "", "editUser");
	/** Whether the current user may delete a user account. */
	const canDelete = canDo(user?.role ?? "", "deleteUser");

	useEffect(() => {
		if (user && user.role !== "admin") router.push("/dashboard");
	}, [user, router]);

	/* ─── Load users ──────────────────────────────────────────────────── */

	const load = useCallback(async () => {
		try {
			const data = await api.get<User[]>("/users");
			setUsers(data);
		} catch {
			showToast("Erreur de chargement", "error");
		} finally {
			setLoading(false);
		}
	}, [showToast]);

	useEffect(() => {
		load();
	}, [load]);

	/* ─── Filtered users ──────────────────────────────────────────────── */

	const filtered = users.filter((u) => {
		if (search) {
			const q = search.toLowerCase();
			if (
				!u.name.toLowerCase().includes(q) &&
				!u.username.toLowerCase().includes(q)
			)
				return false;
		}
		if (roleFilter !== "all" && u.role !== roleFilter) return false;
		if (statusFilter === "active" && !u.active) return false;
		if (statusFilter === "inactive" && u.active) return false;
		return true;
	});

	/* ─── Stats ───────────────────────────────────────────────────────── */

	const stats = {
		total: users.length,
		active: users.filter((u) => u.active).length,
		admins: users.filter((u) => u.role === "admin").length,
		members: users.filter((u) => u.role === "member").length,
	};

	/* ─── Profile Modal ───────────────────────────────────────────────── */

	const openProfile = async (u: User) => {
		setProfileUser(u);
		setProfileTab("apercu");
		setProfileLoading(true);
		setProfileData(null);

		try {
			const [salesRes, tasks, projects, events, logsRes, allClients] =
				await Promise.all([
					api.get<{ sales: Sale[]; total: number }>(
						`/sales?sellerId=${u.id}&limit=200`,
					),
					api.get<Task[]>(`/tasks?assigneeId=${u.id}`),
					api.get<Project[]>("/projects"),
					api.get<Event[]>(`/events?userId=${u.id}`),
					api.get<{ logs: Log[]; total: number }>(
						`/logs?userId=${u.id}&limit=50`,
					),
					api.get<Client[]>("/clients"),
				]);

			// Derive clients from sales: unique clients that purchased from this seller
			const clientIdsFromSales = new Set(
				salesRes.sales
					.filter((s) => s.clientId)
					.map((s) => s.clientId as number),
			);
			const userClients = allClients.filter((c) =>
				clientIdsFromSales.has(c.id),
			);

			// Filter projects where the user is a member
			const userProjects = projects.filter(
				(p) => p.members && p.members.includes(u.id),
			);

			setProfileData({
				sales: salesRes.sales,
				salesTotalCount: salesRes.total,
				clients: userClients,
				tasks,
				projects: userProjects,
				events,
				logs: logsRes.logs,
				logsTotal: logsRes.total,
			});
		} catch {
			showToast("Erreur lors du chargement du profil", "error");
		} finally {
			setProfileLoading(false);
		}
	};

	const closeProfile = () => {
		setProfileUser(null);
		setProfileData(null);
	};

	/* ─── Create / Edit ───────────────────────────────────────────────── */

	const openCreate = () => {
		setEditMode(false);
		setForm(INITIAL_FORM);
		setShowModal(true);
	};

	const openEdit = (u: User) => {
		setEditMode(true);
		setEditTarget(u);
		setForm({
			username: u.username,
			password: "",
			name: u.name,
			role: u.role,
			avatar: u.avatar || "",
			active: u.active,
		});
		setShowModal(true);
	};

	const handleSave = async () => {
		if (!form.username || (!editMode && !form.password) || !form.name) {
			showToast("Champs requis manquants", "error");
			return;
		}
		setSaving(true);
		try {
			if (editMode && editTarget) {
				const payload: Record<string, unknown> = { ...form };
				if (!form.password) delete payload.password;
				await api.put(`/users/${editTarget.id}`, payload);
				showToast("Utilisateur modifie", "success");
			} else {
				await api.post("/users", form);
				showToast("Utilisateur cree", "success");
			}
			setShowModal(false);
			load();
		} catch (e) {
			showToast((e as Error).message, "error");
		} finally {
			setSaving(false);
		}
	};

	const handleDelete = async (u: User) => {
		if (u.id === user?.id) {
			showToast("Impossible de supprimer votre propre compte", "error");
			return;
		}
		const ok = await confirm({
			title: "Supprimer l'utilisateur",
			message: `Supprimer "${u.name}" ?`,
			confirmLabel: "Supprimer",
			danger: true,
		});
		if (!ok) return;
		try {
			await api.delete(`/users/${u.id}`);
			showToast("Utilisateur supprime", "success");
			if (profileUser?.id === u.id) closeProfile();
			load();
		} catch (e) {
			showToast((e as Error).message, "error");
		}
	};

	/* ─── Profile Stats (computed) ────────────────────────────────────── */

	const getProfileStats = () => {
		if (!profileData) return null;
		const completedSales = profileData.sales.filter(
			(s) => s.status === "completed",
		);
		const totalRevenue = completedSales.reduce(
			(sum, s) => sum + s.totalTTC,
			0,
		);
		const activeTasks = profileData.tasks.filter(
			(t) =>
				t.status === "en_cours" ||
				t.status === "en_attente" ||
				t.status === "bloquee",
		);
		const activeProjects = profileData.projects.filter(
			(p) => p.status === "active",
		);
		return {
			totalSales: profileData.salesTotalCount,
			totalRevenue,
			activeTasks: activeTasks.length,
			activeProjects: activeProjects.length,
			totalClients: profileData.clients.length,
		};
	};

	/* ─── Guard ───────────────────────────────────────────────────────── */

	if (user?.role !== "admin") return null;

	/* ─── Render ──────────────────────────────────────────────────────── */

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
							strokeWidth="2"
						>
							<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
							<circle cx="12" cy="7" r="4" />
						</svg>
					</div>
					<div className="phb-text">
						<h1>Utilisateurs</h1>
						<p className="page-description">
							Gestion des comptes et permissions
						</p>
					</div>
				</div>
				<div className="page-header-box-actions">
				{canCreate && (
					<button className="btn-primary btn-sm" onClick={openCreate}>
						<svg
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2.5"
						>
							<line x1="12" y1="5" x2="12" y2="19" />
							<line x1="5" y1="12" x2="19" y2="12" />
						</svg>
						Nouvel utilisateur
					</button>
				)}
			</div>
		</div>

			{/* Stats */}
			<div
				className="stats-grid"
				style={{
					gridTemplateColumns: "repeat(4,1fr)",
					marginBottom: "1.25rem",
				}}
			>
				{[
					{ label: "Total", value: stats.total },
					{ label: "Actifs", value: stats.active },
					{ label: "Admins", value: stats.admins },
					{ label: "Membres", value: stats.members },
				].map((s) => (
					<div key={s.label} className="stat-card">
						<div className="stat-info">
							<div className="stat-value">{s.value}</div>
							<div className="stat-label">{s.label}</div>
						</div>
					</div>
				))}
			</div>

			{/* Search + Filters */}
			<div
				className="card"
				style={{
					marginBottom: "1.25rem",
					display: "flex",
					gap: "0.75rem",
					alignItems: "center",
					flexWrap: "wrap",
				}}
			>
				<div style={{ flex: 1, minWidth: "200px" }}>
					<input
						type="text"
						placeholder="Rechercher par nom ou identifiant..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						style={{
							width: "100%",
							padding: "0.5rem 0.75rem",
							border: "1px solid var(--border-color)",
							borderRadius: "8px",
							background: "var(--bg-alt)",
							color: "var(--text)",
							fontSize: "0.85rem",
						}}
					/>
				</div>
				<select
					value={roleFilter}
					onChange={(e) => setRoleFilter(e.target.value)}
					style={{
						padding: "0.5rem 0.75rem",
						border: "1px solid var(--border-color)",
						borderRadius: "8px",
						background: "var(--bg-alt)",
						color: "var(--text)",
						fontSize: "0.85rem",
					}}
				>
					<option value="all">Tous les roles</option>
					{Object.entries(ROLE_LABELS).map(([v, l]) => (
						<option key={v} value={v}>
							{l}
						</option>
					))}
				</select>
				<select
					value={statusFilter}
					onChange={(e) => setStatusFilter(e.target.value)}
					style={{
						padding: "0.5rem 0.75rem",
						border: "1px solid var(--border-color)",
						borderRadius: "8px",
						background: "var(--bg-alt)",
						color: "var(--text)",
						fontSize: "0.85rem",
					}}
				>
					<option value="all">Tous les statuts</option>
					<option value="active">Actifs</option>
					<option value="inactive">Inactifs</option>
				</select>
				{(search || roleFilter !== "all" || statusFilter !== "all") && (
					<span
						style={{
							fontSize: "0.78rem",
							color: "var(--text-muted)",
						}}
					>
						{filtered.length} resultat
						{filtered.length !== 1 ? "s" : ""}
					</span>
				)}
			</div>

			{/* User grid */}
			{loading ? (
				<div className="empty-state">
					<p>Chargement...</p>
				</div>
			) : filtered.length === 0 ? (
				<div className="empty-state">
					<p>Aucun utilisateur trouve</p>
				</div>
			) : (
				<div
					style={{
						display: "grid",
						gridTemplateColumns:
							"repeat(auto-fill, minmax(260px, 1fr))",
						gap: "1rem",
					}}
				>
					{filtered.map((u) => (
						<div
							key={u.id}
							className="card"
							style={{
								cursor: "pointer",
								transition:
									"box-shadow 0.15s ease, transform 0.15s ease",
							}}
							onClick={() => openProfile(u)}
						>
							<div
								style={{
									display: "flex",
									gap: "0.85rem",
									alignItems: "flex-start",
									marginBottom: "0.75rem",
								}}
							>
								<div
									style={{
										width: "46px",
										height: "46px",
										minWidth: "46px",
										background:
											"linear-gradient(135deg, #2e4a8a, #b8923a)",
										borderRadius: "12px",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										fontSize: "1.3rem",
										color: "#fff",
										fontWeight: 700,
									}}
								>
									{u.avatar ||
										u.name.charAt(0).toUpperCase()}
								</div>
								<div style={{ flex: 1, minWidth: 0 }}>
									<div
										style={{
											fontWeight: 700,
											fontSize: "0.95rem",
											color: "var(--text)",
											whiteSpace: "nowrap",
											overflow: "hidden",
											textOverflow: "ellipsis",
										}}
									>
										{u.name}
									</div>
									<div
										style={{
											fontSize: "0.78rem",
											color: "var(--text-muted)",
											marginBottom: "0.35rem",
										}}
									>
										@{u.username}
									</div>
									<div
										style={{
											display: "flex",
											gap: "0.35rem",
											flexWrap: "wrap",
										}}
									>
										<span
											className={`badge ${ROLE_BADGE[u.role]}`}
											style={{ fontSize: "0.7rem" }}
										>
											{ROLE_LABELS[u.role]}
										</span>
										<span
											className={`badge ${u.active ? "badge-success" : "badge-light"}`}
											style={{ fontSize: "0.7rem" }}
										>
											{u.active ? "Actif" : "Inactif"}
										</span>
									</div>
								</div>
							</div>

							<div
								style={{
									fontSize: "0.72rem",
									color: "var(--text-muted)",
									marginBottom: "0.6rem",
									display: "flex",
									alignItems: "center",
									gap: "0.3rem",
								}}
							>
								<svg
									width="11"
									height="11"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
								>
									<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
									<circle cx="12" cy="12" r="3" />
								</svg>
								Cliquer pour voir le profil complet
							</div>

							<div
								style={{ display: "flex", gap: "0.4rem" }}
								onClick={(e) => e.stopPropagation()}
							>
								<button
									className="btn-icon"
									style={{ flex: 1 }}
									onClick={() => openEdit(u)}
									title="Modifier"
								>
									<svg
										width="14"
										height="14"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
									>
										<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
										<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
									</svg>
								</button>
								{u.id !== user?.id && (
									<button
										className="btn-icon delete"
										style={{ flex: 1 }}
										onClick={() => handleDelete(u)}
										title="Supprimer"
									>
										<svg
											width="14"
											height="14"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="2"
										>
											<polyline points="3 6 5 6 21 6" />
											<path d="M19 6l-1 14H6L5 6" />
										</svg>
									</button>
								)}
							</div>
						</div>
					))}
				</div>
			)}

			{/* ─── Profile Modal ───────────────────────────────────────── */}
			{profileUser && (
				<div className="modal-overlay" onClick={closeProfile}>
					<div
						className="modal-content"
						style={{
							maxWidth: "960px",
							width: "95vw",
							maxHeight: "90vh",
							display: "flex",
							flexDirection: "column",
							overflow: "hidden",
						}}
						onClick={(e) => e.stopPropagation()}
					>
						{/* Modal Header */}
						<div
							className="modal-header"
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								borderBottom: "1px solid var(--border-color)",
								paddingBottom: "0.75rem",
								marginBottom: 0,
								flexShrink: 0,
							}}
						>
							<div
								style={{
									display: "flex",
									alignItems: "center",
									gap: "0.85rem",
								}}
							>
								<div
									style={{
										width: "48px",
										height: "48px",
										minWidth: "48px",
										background:
											"linear-gradient(135deg, #2e4a8a, #b8923a)",
										borderRadius: "12px",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										fontSize: "1.4rem",
										color: "#fff",
										fontWeight: 700,
									}}
								>
									{profileUser.avatar ||
										profileUser.name
											.charAt(0)
											.toUpperCase()}
								</div>
								<div>
									<h3
										style={{
											margin: 0,
											fontSize: "1.1rem",
											fontWeight: 700,
											color: "var(--text)",
										}}
									>
										{profileUser.name}
									</h3>
									<div
										style={{
											fontSize: "0.8rem",
											color: "var(--text-muted)",
											display: "flex",
											alignItems: "center",
											gap: "0.5rem",
										}}
									>
										<span>@{profileUser.username}</span>
										<span
											className={`badge ${ROLE_BADGE[profileUser.role]}`}
											style={{ fontSize: "0.68rem" }}
										>
											{ROLE_LABELS[profileUser.role]}
										</span>
										<span
											className={`badge ${profileUser.active ? "badge-success" : "badge-light"}`}
											style={{ fontSize: "0.68rem" }}
										>
											{profileUser.active
												? "Actif"
												: "Inactif"}
										</span>
									</div>
								</div>
							</div>
							<div
								style={{
									display: "flex",
									gap: "0.5rem",
									alignItems: "center",
								}}
							>
								<button
									className="btn-secondary btn-sm"
									onClick={() => {
										closeProfile();
										openEdit(profileUser);
									}}
								>
									<svg
										width="13"
										height="13"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
									>
										<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
										<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
									</svg>
									Modifier
								</button>
								<button
									className="btn-icon"
									onClick={closeProfile}
									title="Fermer"
								>
									<svg
										width="16"
										height="16"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
									>
										<line
											x1="18"
											y1="6"
											x2="6"
											y2="18"
										/>
										<line
											x1="6"
											y1="6"
											x2="18"
											y2="18"
										/>
									</svg>
								</button>
							</div>
						</div>

						{/* Tabs */}
						<div
							style={{
								display: "flex",
								gap: "0",
								borderBottom: "1px solid var(--border-color)",
								overflowX: "auto",
								flexShrink: 0,
							}}
						>
							{PROFILE_TABS.map((tab) => (
								<button
									key={tab.key}
									onClick={() => setProfileTab(tab.key)}
									style={{
										padding: "0.65rem 1rem",
										fontSize: "0.82rem",
										fontWeight:
											profileTab === tab.key ? 700 : 500,
										color:
											profileTab === tab.key
												? "var(--accent)"
												: "var(--text-muted)",
										background: "none",
										border: "none",
										borderBottom:
											profileTab === tab.key
												? "2px solid var(--accent)"
												: "2px solid transparent",
										cursor: "pointer",
										whiteSpace: "nowrap",
										transition: "all 0.15s ease",
									}}
								>
									{tab.label}
								</button>
							))}
						</div>

						{/* Modal body */}
						<div
							className="modal-body"
							style={{
								flex: 1,
								overflowY: "auto",
								padding: "1rem",
							}}
						>
							{profileLoading ? (
								<div
									style={{
										textAlign: "center",
										padding: "3rem",
										color: "var(--text-muted)",
									}}
								>
									Chargement du profil...
								</div>
							) : !profileData ? (
								<div
									style={{
										textAlign: "center",
										padding: "3rem",
										color: "var(--text-muted)",
									}}
								>
									Erreur lors du chargement
								</div>
							) : (
								<>
									{/* ── Apercu Tab ── */}
									{profileTab === "apercu" && (
										<TabApercu
											profileUser={profileUser}
											data={profileData}
											stats={getProfileStats()}
										/>
									)}

									{/* ── Ventes Tab ── */}
									{profileTab === "ventes" && (
										<TabVentes data={profileData} />
									)}

									{/* ── Clients Tab ── */}
									{profileTab === "clients" && (
										<TabClients
											data={profileData}
											sales={profileData.sales}
										/>
									)}

									{/* ── Taches Tab ── */}
									{profileTab === "taches" && (
										<TabTaches data={profileData} />
									)}

									{/* ── Projets Tab ── */}
									{profileTab === "projets" && (
										<TabProjets data={profileData} />
									)}

									{/* ── Calendrier Tab ── */}
									{profileTab === "calendrier" && (
										<TabCalendrier data={profileData} />
									)}

									{/* ── Logs Tab ── */}
									{profileTab === "logs" && (
										<TabLogs data={profileData} />
									)}
								</>
							)}
						</div>
					</div>
				</div>
			)}

			{/* ─── Create/Edit Modal ───────────────────────────────────── */}
			{showModal && (
				<div className="modal-overlay">
					<div className="modal-content">
						<div className="modal-header">
							<h3>
								{editMode
									? "Modifier l'utilisateur"
									: "Nouvel utilisateur"}
							</h3>
							<button
								className="btn-icon"
								onClick={() => setShowModal(false)}
							>
								<svg
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
								>
									<line
										x1="18"
										y1="6"
										x2="6"
										y2="18"
									/>
									<line
										x1="6"
										y1="6"
										x2="18"
										y2="18"
									/>
								</svg>
							</button>
						</div>
						<div className="modal-body">
							<div className="form-group">
								<label>Nom complet *</label>
								<input
									value={form.name}
									onChange={(e) =>
										setForm({
											...form,
											name: e.target.value,
										})
									}
									placeholder="Prenom Nom"
								/>
							</div>
							<div className="form-group">
								<label>Nom d&apos;utilisateur *</label>
								<input
									value={form.username}
									onChange={(e) =>
										setForm({
											...form,
											username: e.target.value,
										})
									}
									placeholder="login"
									autoCapitalize="none"
								/>
							</div>
							<div className="form-group">
								<label>
									{editMode
										? "Nouveau mot de passe (laisser vide pour conserver)"
										: "Mot de passe *"}
								</label>
								<input
									type="password"
									value={form.password}
									onChange={(e) =>
										setForm({
											...form,
											password: e.target.value,
										})
									}
									placeholder="••••••••"
								/>
							</div>
							<div className="form-group">
								<label>Role</label>
								<select
									value={form.role}
									onChange={(e) =>
										setForm({
											...form,
											role: e.target.value as UserRole,
										})
									}
								>
									{Object.entries(ROLE_LABELS).map(
										([v, l]) => (
											<option key={v} value={v}>
												{l}
											</option>
										),
									)}
								</select>
							</div>
							<div className="form-group">
								<label>Avatar (emoji)</label>
								<input
									value={form.avatar}
									onChange={(e) =>
										setForm({
											...form,
											avatar: e.target.value,
										})
									}
									placeholder="🧑"
									maxLength={2}
								/>
							</div>
							<div className="form-group">
								<label
									style={{
										display: "flex",
										alignItems: "center",
										gap: "0.6rem",
										cursor: "pointer",
									}}
								>
									<input
										type="checkbox"
										checked={form.active}
										onChange={(e) =>
											setForm({
												...form,
												active: e.target.checked,
											})
										}
										style={{ width: "auto", margin: 0 }}
									/>
									Compte actif
								</label>
							</div>
						</div>
						<div className="modal-footer">
							<button
								className="btn-secondary btn-sm"
								onClick={() => setShowModal(false)}
							>
								Annuler
							</button>
							<button
								className="btn-primary btn-sm"
								onClick={handleSave}
								disabled={saving}
							>
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

/* ═══════════════════════════════════════════════════════════════════════════
   TAB COMPONENTS
   ═══════════════════════════════════════════════════════════════════════════ */

/* ─── Section title helper ─────────────────────────────────────────────── */

function SectionTitle({ children }: { children: React.ReactNode }) {
	return (
		<div
			style={{
				fontSize: "0.72rem",
				fontWeight: 700,
				color: "var(--text-muted)",
				textTransform: "uppercase",
				letterSpacing: "0.07em",
				marginBottom: "0.6rem",
				marginTop: "1rem",
			}}
		>
			{children}
		</div>
	);
}

/* ─── Apercu Tab ───────────────────────────────────────────────────────── */

function TabApercu({
	profileUser,
	data,
	stats,
}: {
	profileUser: User;
	data: ProfileData;
	stats: ReturnType<() => {
		totalSales: number;
		totalRevenue: number;
		activeTasks: number;
		activeProjects: number;
		totalClients: number;
	}> | null;
}) {
	return (
		<div>
			{/* User info section */}
			<div
				style={{
					display: "flex",
					gap: "1.5rem",
					alignItems: "flex-start",
					marginBottom: "1.25rem",
					flexWrap: "wrap",
				}}
			>
				<div
					style={{
						width: "80px",
						height: "80px",
						minWidth: "80px",
						background:
							"linear-gradient(135deg, #2e4a8a, #b8923a)",
						borderRadius: "16px",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						fontSize: "2.2rem",
						color: "#fff",
						fontWeight: 700,
					}}
				>
					{profileUser.avatar ||
						profileUser.name.charAt(0).toUpperCase()}
				</div>
				<div style={{ flex: 1, minWidth: "200px" }}>
					<div
						style={{
							fontWeight: 700,
							fontSize: "1.25rem",
							color: "var(--text)",
							marginBottom: "0.15rem",
						}}
					>
						{profileUser.name}
					</div>
					<div
						style={{
							fontSize: "0.85rem",
							color: "var(--text-muted)",
							marginBottom: "0.5rem",
						}}
					>
						@{profileUser.username}
					</div>
					<div
						style={{
							display: "flex",
							gap: "0.5rem",
							flexWrap: "wrap",
							marginBottom: "0.5rem",
						}}
					>
						<span
							className={`badge ${ROLE_BADGE[profileUser.role]}`}
						>
							{ROLE_LABELS[profileUser.role]}
						</span>
						<span
							className={`badge ${profileUser.active ? "badge-success" : "badge-light"}`}
						>
							{profileUser.active ? "Actif" : "Inactif"}
						</span>
					</div>
					<div
						style={{
							fontSize: "0.8rem",
							color: "var(--text-muted)",
						}}
					>
						Membre depuis le{" "}
						{formatDate(profileUser.createdAt as string)}
					</div>
				</div>
			</div>

			{/* Key stats */}
			{stats && (
				<>
					<SectionTitle>Statistiques cles</SectionTitle>
					<div
						className="stats-grid"
						style={{
							gridTemplateColumns:
								"repeat(auto-fill, minmax(150px, 1fr))",
							marginBottom: "0.5rem",
						}}
					>
						<div className="stat-card">
							<div className="stat-info">
								<div className="stat-value">
									{stats.totalSales}
								</div>
								<div className="stat-label">
									Ventes totales
								</div>
							</div>
						</div>
						<div className="stat-card">
							<div className="stat-info">
								<div
									className="stat-value"
									style={{ fontSize: "1rem" }}
								>
									{eur(stats.totalRevenue)}
								</div>
								<div className="stat-label">
									Chiffre d&apos;affaires
								</div>
							</div>
						</div>
						<div className="stat-card">
							<div className="stat-info">
								<div className="stat-value">
									{stats.activeTasks}
								</div>
								<div className="stat-label">
									Taches actives
								</div>
							</div>
						</div>
						<div className="stat-card">
							<div className="stat-info">
								<div className="stat-value">
									{stats.activeProjects}
								</div>
								<div className="stat-label">
									Projets actifs
								</div>
							</div>
						</div>
						<div className="stat-card">
							<div className="stat-info">
								<div className="stat-value">
									{stats.totalClients}
								</div>
								<div className="stat-label">Clients</div>
							</div>
						</div>
					</div>
				</>
			)}

			{/* Recent activity preview */}
			<SectionTitle>
				Activite recente ({data.logsTotal} actions au total)
			</SectionTitle>
			{data.logs.length === 0 ? (
				<div
					style={{
						textAlign: "center",
						padding: "1.5rem",
						color: "var(--text-muted)",
						fontSize: "0.85rem",
					}}
				>
					Aucune activite enregistree
				</div>
			) : (
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "0.35rem",
					}}
				>
					{data.logs.slice(0, 8).map((log) => (
						<div
							key={log.id}
							style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
								padding: "0.5rem 0.65rem",
								background: "var(--bg-alt)",
								borderRadius: "7px",
								fontSize: "0.82rem",
							}}
						>
							<div
								style={{
									display: "flex",
									alignItems: "center",
									gap: "0.5rem",
									flex: 1,
									minWidth: 0,
								}}
							>
								<span
									style={{
										fontWeight: 600,
										color: "var(--text)",
									}}
								>
									{log.action}
								</span>
								{log.details && (
									<span
										style={{
											color: "var(--text-muted)",
											overflow: "hidden",
											textOverflow: "ellipsis",
											whiteSpace: "nowrap",
										}}
									>
										{log.details}
									</span>
								)}
							</div>
							<div
								style={{
									display: "flex",
									alignItems: "center",
									gap: "0.4rem",
									flexShrink: 0,
								}}
							>
								{log.module && (
									<span
										className={`badge ${MODULE_BADGE[log.module] || "badge-light"}`}
										style={{ fontSize: "0.65rem" }}
									>
										{log.module}
									</span>
								)}
								<span
									style={{
										fontSize: "0.7rem",
										color: "var(--text-muted)",
										whiteSpace: "nowrap",
									}}
								>
									{formatTs(log.timestamp as string)}
								</span>
							</div>
						</div>
					))}
				</div>
			)}

			{/* Upcoming events preview */}
			{data.events.filter(
				(e) => new Date(e.date) >= new Date(),
			).length > 0 && (
				<>
					<SectionTitle>Prochains evenements</SectionTitle>
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							gap: "0.35rem",
						}}
					>
						{data.events
							.filter((e) => new Date(e.date) >= new Date())
							.slice(0, 5)
							.map((ev) => (
								<div
									key={ev.id}
									style={{
										display: "flex",
										justifyContent: "space-between",
										alignItems: "center",
										padding: "0.5rem 0.65rem",
										background: "var(--bg-alt)",
										borderRadius: "7px",
										fontSize: "0.82rem",
									}}
								>
									<div
										style={{
											display: "flex",
											alignItems: "center",
											gap: "0.5rem",
										}}
									>
										<span
											style={{
												width: "8px",
												height: "8px",
												borderRadius: "50%",
												background:
													ev.color || "var(--accent)",
												flexShrink: 0,
											}}
										/>
										<span
											style={{
												fontWeight: 600,
												color: "var(--text)",
											}}
										>
											{ev.title}
										</span>
										<span
											className={`badge ${EVENT_BADGE[ev.type] || "badge-light"}`}
											style={{ fontSize: "0.65rem" }}
										>
											{EVENT_LABELS[ev.type] || ev.type}
										</span>
									</div>
									<span
										style={{
											fontSize: "0.75rem",
											color: "var(--text-muted)",
											whiteSpace: "nowrap",
										}}
									>
										{formatDate(ev.date as string)}
									</span>
								</div>
							))}
					</div>
				</>
			)}
		</div>
	);
}

/* ─── Ventes Tab ───────────────────────────────────────────────────────── */

function TabVentes({ data }: { data: ProfileData }) {
	const completedSales = data.sales.filter(
		(s) => s.status === "completed",
	);
	const totalTTC = completedSales.reduce((sum, s) => sum + s.totalTTC, 0);
	const totalHT = completedSales.reduce((sum, s) => sum + s.totalHT, 0);

	return (
		<div>
			{/* Sales summary */}
			<div
				className="stats-grid"
				style={{
					gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
					marginBottom: "1rem",
				}}
			>
				<div className="stat-card">
					<div className="stat-info">
						<div className="stat-value">
							{data.salesTotalCount}
						</div>
						<div className="stat-label">Total ventes</div>
					</div>
				</div>
				<div className="stat-card">
					<div className="stat-info">
						<div className="stat-value">
							{completedSales.length}
						</div>
						<div className="stat-label">Completees</div>
					</div>
				</div>
				<div className="stat-card">
					<div className="stat-info">
						<div
							className="stat-value"
							style={{ fontSize: "0.95rem" }}
						>
							{eur(totalTTC)}
						</div>
						<div className="stat-label">CA TTC</div>
					</div>
				</div>
				<div className="stat-card">
					<div className="stat-info">
						<div
							className="stat-value"
							style={{ fontSize: "0.95rem" }}
						>
							{eur(totalHT)}
						</div>
						<div className="stat-label">CA HT</div>
					</div>
				</div>
			</div>

			{/* Sales table */}
			{data.sales.length === 0 ? (
				<div
					style={{
						textAlign: "center",
						padding: "2rem",
						color: "var(--text-muted)",
						fontSize: "0.85rem",
					}}
				>
					Aucune vente enregistree
				</div>
			) : (
				<div style={{ overflowX: "auto" }}>
					<table className="data-table">
						<thead>
							<tr>
								<th>Date</th>
								<th>Produit</th>
								<th>Client</th>
								<th>Qte</th>
								<th>Total TTC</th>
								<th>Statut</th>
								<th>Plateforme</th>
							</tr>
						</thead>
						<tbody>
							{data.sales.map((s) => (
								<tr key={s.id}>
									<td
										style={{
											whiteSpace: "nowrap",
											fontSize: "0.82rem",
										}}
									>
										{formatDate(s.date as string)}
									</td>
									<td
										style={{
											fontWeight: 600,
											fontSize: "0.82rem",
										}}
									>
										{s.product?.name || `#${s.productId}`}
									</td>
									<td style={{ fontSize: "0.82rem" }}>
										{s.client?.name || "—"}
									</td>
									<td style={{ fontSize: "0.82rem" }}>
										{s.quantity}
									</td>
									<td
										style={{
											fontWeight: 600,
											fontSize: "0.82rem",
											whiteSpace: "nowrap",
										}}
									>
										{eur(s.totalTTC)}
									</td>
									<td>
										<span
											className={`badge ${SALE_STATUS_BADGE[s.status] || "badge-light"}`}
											style={{ fontSize: "0.7rem" }}
										>
											{SALE_STATUS_LABEL[s.status] ||
												s.status}
										</span>
									</td>
									<td style={{ fontSize: "0.82rem" }}>
										{s.platform || "—"}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}

/* ─── Clients Tab ──────────────────────────────────────────────────────── */

function TabClients({
	data,
	sales,
}: {
	data: ProfileData;
	sales: Sale[];
}) {
	// Compute revenue per client from this user's sales
	const clientRevenueMap = new Map<number, number>();
	const clientSalesCountMap = new Map<number, number>();
	sales
		.filter((s) => s.status === "completed" && s.clientId)
		.forEach((s) => {
			const cid = s.clientId as number;
			clientRevenueMap.set(
				cid,
				(clientRevenueMap.get(cid) || 0) + s.totalTTC,
			);
			clientSalesCountMap.set(
				cid,
				(clientSalesCountMap.get(cid) || 0) + 1,
			);
		});

	return (
		<div>
			<div
				style={{
					marginBottom: "0.75rem",
					fontSize: "0.82rem",
					color: "var(--text-muted)",
				}}
			>
				{data.clients.length} client
				{data.clients.length !== 1 ? "s" : ""} associe
				{data.clients.length !== 1 ? "s" : ""} via les ventes
			</div>

			{data.clients.length === 0 ? (
				<div
					style={{
						textAlign: "center",
						padding: "2rem",
						color: "var(--text-muted)",
						fontSize: "0.85rem",
					}}
				>
					Aucun client associe
				</div>
			) : (
				<div style={{ overflowX: "auto" }}>
					<table className="data-table">
						<thead>
							<tr>
								<th>Nom</th>
								<th>Entreprise</th>
								<th>Email</th>
								<th>Telephone</th>
								<th>Statut</th>
								<th>Ventes</th>
								<th>CA TTC</th>
							</tr>
						</thead>
						<tbody>
							{data.clients.map((c) => (
								<tr key={c.id}>
									<td
										style={{
											fontWeight: 600,
											fontSize: "0.82rem",
										}}
									>
										{c.name}
									</td>
									<td style={{ fontSize: "0.82rem" }}>
										{c.company || "—"}
									</td>
									<td style={{ fontSize: "0.82rem" }}>
										{c.email || "—"}
									</td>
									<td style={{ fontSize: "0.82rem" }}>
										{c.phone || "—"}
									</td>
									<td>
										<span
											className={`badge ${CLIENT_STATUS_BADGE[c.status] || "badge-light"}`}
											style={{ fontSize: "0.7rem" }}
										>
											{CLIENT_STATUS_LABEL[c.status] ||
												c.status}
										</span>
									</td>
									<td style={{ fontSize: "0.82rem" }}>
										{clientSalesCountMap.get(c.id) || 0}
									</td>
									<td
										style={{
											fontWeight: 600,
											fontSize: "0.82rem",
											whiteSpace: "nowrap",
										}}
									>
										{eur(
											clientRevenueMap.get(c.id) || 0,
										)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}

/* ─── Taches Tab ───────────────────────────────────────────────────────── */

function TabTaches({ data }: { data: ProfileData }) {
	// Group tasks by status category
	const todoTasks = data.tasks.filter(
		(t) => t.status === "en_attente",
	);
	const inProgressTasks = data.tasks.filter(
		(t) => t.status === "en_cours" || t.status === "bloquee",
	);
	const doneTasks = data.tasks.filter(
		(t) => t.status === "realisee" || t.status === "annulee",
	);

	const groups = [
		{ label: "A faire", tasks: todoTasks, color: "var(--text-muted)" },
		{
			label: "En cours",
			tasks: inProgressTasks,
			color: "var(--accent)",
		},
		{ label: "Terminees", tasks: doneTasks, color: "var(--success)" },
	];

	return (
		<div>
			{/* Summary */}
			<div
				className="stats-grid"
				style={{
					gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
					marginBottom: "1rem",
				}}
			>
				<div className="stat-card">
					<div className="stat-info">
						<div className="stat-value">{data.tasks.length}</div>
						<div className="stat-label">Total</div>
					</div>
				</div>
				<div className="stat-card">
					<div className="stat-info">
						<div className="stat-value">{todoTasks.length}</div>
						<div className="stat-label">A faire</div>
					</div>
				</div>
				<div className="stat-card">
					<div className="stat-info">
						<div className="stat-value">
							{inProgressTasks.length}
						</div>
						<div className="stat-label">En cours</div>
					</div>
				</div>
				<div className="stat-card">
					<div className="stat-info">
						<div className="stat-value">{doneTasks.length}</div>
						<div className="stat-label">Terminees</div>
					</div>
				</div>
			</div>

			{data.tasks.length === 0 ? (
				<div
					style={{
						textAlign: "center",
						padding: "2rem",
						color: "var(--text-muted)",
						fontSize: "0.85rem",
					}}
				>
					Aucune tache assignee
				</div>
			) : (
				groups.map(
					(group) =>
						group.tasks.length > 0 && (
							<div key={group.label} style={{ marginBottom: "1rem" }}>
								<div
									style={{
										fontSize: "0.75rem",
										fontWeight: 700,
										color: group.color,
										textTransform: "uppercase",
										letterSpacing: "0.06em",
										marginBottom: "0.5rem",
										display: "flex",
										alignItems: "center",
										gap: "0.4rem",
									}}
								>
									<span
										style={{
											width: "8px",
											height: "8px",
											borderRadius: "50%",
											background: group.color,
										}}
									/>
									{group.label} ({group.tasks.length})
								</div>
								<div
									style={{
										display: "flex",
										flexDirection: "column",
										gap: "0.35rem",
									}}
								>
									{group.tasks.map((t) => (
										<div
											key={t.id}
											style={{
												display: "flex",
												justifyContent: "space-between",
												alignItems: "center",
												padding: "0.55rem 0.75rem",
												background: "var(--bg-alt)",
												borderRadius: "8px",
												gap: "0.5rem",
											}}
										>
											<div
												style={{
													flex: 1,
													minWidth: 0,
												}}
											>
												<div
													style={{
														fontWeight: 600,
														fontSize: "0.85rem",
														color: "var(--text)",
														overflow: "hidden",
														textOverflow:
															"ellipsis",
														whiteSpace: "nowrap",
													}}
												>
													{t.title}
												</div>
												{t.project && (
													<div
														style={{
															fontSize:
																"0.75rem",
															color: "var(--text-muted)",
														}}
													>
														{t.project.emoji}{" "}
														{t.project.name}
													</div>
												)}
											</div>
											<div
												style={{
													display: "flex",
													alignItems: "center",
													gap: "0.35rem",
													flexShrink: 0,
												}}
											>
												<span
													className={`badge ${TASK_PRIORITY_BADGE[t.priority] || "badge-light"}`}
													style={{
														fontSize: "0.65rem",
													}}
												>
													{TASK_PRIORITY_LABEL[
														t.priority
													] || t.priority}
												</span>
												<span
													className={`badge ${TASK_STATUS_BADGE[t.status] || "badge-light"}`}
													style={{
														fontSize: "0.65rem",
													}}
												>
													{TASK_STATUS_LABEL[
														t.status
													] || t.status}
												</span>
												{t.dueDate && (
													<span
														style={{
															fontSize:
																"0.72rem",
															color:
																!t.completed &&
																t.status !==
																	"realisee" &&
																new Date(
																	t.dueDate,
																) < new Date()
																	? "var(--danger, #c0392b)"
																	: "var(--text-muted)",
															whiteSpace:
																"nowrap",
														}}
													>
														{formatDate(
															t.dueDate as string,
														)}
													</span>
												)}
											</div>
										</div>
									))}
								</div>
							</div>
						),
				)
			)}
		</div>
	);
}

/* ─── Projets Tab ──────────────────────────────────────────────────────── */

function TabProjets({ data }: { data: ProfileData }) {
	return (
		<div>
			<div
				style={{
					marginBottom: "0.75rem",
					fontSize: "0.82rem",
					color: "var(--text-muted)",
				}}
			>
				{data.projects.length} projet
				{data.projects.length !== 1 ? "s" : ""}
			</div>

			{data.projects.length === 0 ? (
				<div
					style={{
						textAlign: "center",
						padding: "2rem",
						color: "var(--text-muted)",
						fontSize: "0.85rem",
					}}
				>
					Aucun projet associe
				</div>
			) : (
				<div
					style={{
						display: "grid",
						gridTemplateColumns:
							"repeat(auto-fill, minmax(260px, 1fr))",
						gap: "0.75rem",
					}}
				>
					{data.projects.map((p) => {
						const progress =
							p.taskCount && p.taskCount > 0
								? Math.round(
										((p.completedTaskCount || 0) /
											p.taskCount) *
											100,
									)
								: 0;
						return (
							<div
								key={p.id}
								style={{
									background: "var(--bg-alt)",
									borderRadius: "10px",
									padding: "1rem",
									border: "1px solid var(--border-color)",
								}}
							>
								<div
									style={{
										display: "flex",
										alignItems: "center",
										gap: "0.6rem",
										marginBottom: "0.5rem",
									}}
								>
									<span style={{ fontSize: "1.3rem" }}>
										{p.emoji || "📁"}
									</span>
									<div style={{ flex: 1, minWidth: 0 }}>
										<div
											style={{
												fontWeight: 700,
												fontSize: "0.9rem",
												color: "var(--text)",
												overflow: "hidden",
												textOverflow: "ellipsis",
												whiteSpace: "nowrap",
											}}
										>
											{p.name}
										</div>
									</div>
									<span
										className={`badge ${PROJECT_STATUS_BADGE[p.status] || "badge-light"}`}
										style={{ fontSize: "0.68rem" }}
									>
										{PROJECT_STATUS_LABEL[p.status] ||
											p.status}
									</span>
								</div>
								{p.description && (
									<div
										style={{
											fontSize: "0.78rem",
											color: "var(--text-muted)",
											marginBottom: "0.5rem",
											overflow: "hidden",
											textOverflow: "ellipsis",
											whiteSpace: "nowrap",
										}}
									>
										{p.description}
									</div>
								)}
								<div
									style={{
										display: "flex",
										alignItems: "center",
										gap: "0.5rem",
										marginBottom: "0.4rem",
									}}
								>
									<div
										style={{
											flex: 1,
											height: "6px",
											background: "var(--border-color)",
											borderRadius: "3px",
											overflow: "hidden",
										}}
									>
										<div
											style={{
												width: `${progress}%`,
												height: "100%",
												background: "var(--accent)",
												borderRadius: "3px",
												transition: "width 0.3s ease",
											}}
										/>
									</div>
									<span
										style={{
											fontSize: "0.72rem",
											color: "var(--text-muted)",
											fontWeight: 600,
											whiteSpace: "nowrap",
										}}
									>
										{progress}%
									</span>
								</div>
								<div
									style={{
										fontSize: "0.75rem",
										color: "var(--text-muted)",
										display: "flex",
										justifyContent: "space-between",
									}}
								>
									<span>
										{p.completedTaskCount || 0}/
										{p.taskCount || 0} taches
									</span>
									<span>
										{formatDate(p.createdAt as string)}
									</span>
								</div>
								{p.membersData && p.membersData.length > 0 && (
									<div
										style={{
											display: "flex",
											gap: "0.25rem",
											marginTop: "0.5rem",
											flexWrap: "wrap",
										}}
									>
										{p.membersData.map((m) => (
											<span
												key={m.id}
												style={{
													display: "inline-flex",
													alignItems: "center",
													justifyContent: "center",
													width: "26px",
													height: "26px",
													borderRadius: "50%",
													background:
														"linear-gradient(135deg, #2e4a8a, #b8923a)",
													color: "#fff",
													fontSize: "0.7rem",
													fontWeight: 700,
												}}
												title={m.name}
											>
												{m.avatar ||
													m.name
														.charAt(0)
														.toUpperCase()}
											</span>
										))}
									</div>
								)}
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}

/* ─── Calendrier Tab ───────────────────────────────────────────────────── */

function TabCalendrier({ data }: { data: ProfileData }) {
	const now = new Date();
	const upcoming = data.events
		.filter((e) => new Date(e.date) >= now)
		.sort(
			(a, b) =>
				new Date(a.date).getTime() - new Date(b.date).getTime(),
		);
	const past = data.events
		.filter((e) => new Date(e.date) < now)
		.sort(
			(a, b) =>
				new Date(b.date).getTime() - new Date(a.date).getTime(),
		);

	const renderEvent = (ev: Event) => (
		<div
			key={ev.id}
			style={{
				display: "flex",
				justifyContent: "space-between",
				alignItems: "flex-start",
				padding: "0.6rem 0.75rem",
				background: "var(--bg-alt)",
				borderRadius: "8px",
				borderLeft: `3px solid ${ev.color || "var(--accent)"}`,
				gap: "0.5rem",
			}}
		>
			<div style={{ flex: 1, minWidth: 0 }}>
				<div
					style={{
						fontWeight: 600,
						fontSize: "0.85rem",
						color: "var(--text)",
						marginBottom: "0.15rem",
					}}
				>
					{ev.title}
				</div>
				{ev.description && (
					<div
						style={{
							fontSize: "0.78rem",
							color: "var(--text-muted)",
							overflow: "hidden",
							textOverflow: "ellipsis",
							whiteSpace: "nowrap",
						}}
					>
						{ev.description}
					</div>
				)}
			</div>
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "flex-end",
					gap: "0.2rem",
					flexShrink: 0,
				}}
			>
				<span
					className={`badge ${EVENT_BADGE[ev.type] || "badge-light"}`}
					style={{ fontSize: "0.65rem" }}
				>
					{EVENT_LABELS[ev.type] || ev.type}
				</span>
				<span
					style={{
						fontSize: "0.72rem",
						color: "var(--text-muted)",
						whiteSpace: "nowrap",
					}}
				>
					{ev.allDay
						? formatDate(ev.date as string)
						: formatDateTime(ev.date as string)}
				</span>
				{ev.endDate && (
					<span
						style={{
							fontSize: "0.68rem",
							color: "var(--text-muted)",
							whiteSpace: "nowrap",
						}}
					>
						→{" "}
						{ev.allDay
							? formatDate(ev.endDate as string)
							: formatDateTime(ev.endDate as string)}
					</span>
				)}
			</div>
		</div>
	);

	return (
		<div>
			<div
				style={{
					marginBottom: "0.75rem",
					fontSize: "0.82rem",
					color: "var(--text-muted)",
				}}
			>
				{data.events.length} evenement
				{data.events.length !== 1 ? "s" : ""} au total
			</div>

			{data.events.length === 0 ? (
				<div
					style={{
						textAlign: "center",
						padding: "2rem",
						color: "var(--text-muted)",
						fontSize: "0.85rem",
					}}
				>
					Aucun evenement
				</div>
			) : (
				<>
					{upcoming.length > 0 && (
						<>
							<SectionTitle>
								A venir ({upcoming.length})
							</SectionTitle>
							<div
								style={{
									display: "flex",
									flexDirection: "column",
									gap: "0.35rem",
									marginBottom: "1rem",
								}}
							>
								{upcoming.map(renderEvent)}
							</div>
						</>
					)}
					{past.length > 0 && (
						<>
							<SectionTitle>
								Passes ({past.length})
							</SectionTitle>
							<div
								style={{
									display: "flex",
									flexDirection: "column",
									gap: "0.35rem",
									opacity: 0.7,
								}}
							>
								{past.map(renderEvent)}
							</div>
						</>
					)}
				</>
			)}
		</div>
	);
}

/* ─── Logs Tab ─────────────────────────────────────────────────────────── */

function TabLogs({ data }: { data: ProfileData }) {
	return (
		<div>
			<div
				style={{
					marginBottom: "0.75rem",
					fontSize: "0.82rem",
					color: "var(--text-muted)",
				}}
			>
				{data.logsTotal} action{data.logsTotal !== 1 ? "s" : ""} au
				total
				{data.logsTotal > 50
					? ` (50 dernieres affichees)`
					: ""}
			</div>

			{data.logs.length === 0 ? (
				<div
					style={{
						textAlign: "center",
						padding: "2rem",
						color: "var(--text-muted)",
						fontSize: "0.85rem",
					}}
				>
					Aucune activite enregistree
				</div>
			) : (
				<div style={{ overflowX: "auto" }}>
					<table className="data-table">
						<thead>
							<tr>
								<th>Date</th>
								<th>Action</th>
								<th>Details</th>
								<th>Module</th>
							</tr>
						</thead>
						<tbody>
							{data.logs.map((log) => (
								<tr key={log.id}>
									<td
										style={{
											whiteSpace: "nowrap",
											fontSize: "0.8rem",
										}}
									>
										{formatTs(log.timestamp as string)}
									</td>
									<td
										style={{
											fontWeight: 600,
											fontSize: "0.82rem",
										}}
									>
										{log.action}
									</td>
									<td
										style={{
											fontSize: "0.8rem",
											color: "var(--text-muted)",
											maxWidth: "300px",
											overflow: "hidden",
											textOverflow: "ellipsis",
											whiteSpace: "nowrap",
										}}
									>
										{log.details || "—"}
									</td>
									<td>
										{log.module ? (
											<span
												className={`badge ${MODULE_BADGE[log.module] || "badge-light"}`}
												style={{
													fontSize: "0.68rem",
												}}
											>
												{log.module}
											</span>
										) : (
											"—"
										)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}
