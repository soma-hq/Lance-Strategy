"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import api from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { useConfirm } from "@/hooks/useConfirm";
import type { Project, User, Task, Event } from "@/types";
import {
	TaskStatusLabels,
	TaskStatusBadges,
	TaskStatusColors,
	PriorityLabels,
	PriorityBadges,
	KanbanColumns,
	EventTypeLabels,
	ProjectColors,
	DefaultValues,
	ProjectStatuses,
	Priorities,
} from "@/types/constants";

/* ================================================================
   Constants
   ================================================================ */

const STATUS_OPTIONS = [
	{
		value: "planning",
		label: "Planification",
		badge: "badge-light",
		color: "#95a5a6",
	},
	{
		value: "active",
		label: "Actif",
		badge: "badge-primary",
		color: "var(--accent)",
	},
	{
		value: "paused",
		label: "En pause",
		badge: "badge-warning",
		color: "var(--warning)",
	},
	{
		value: "completed",
		label: "Terminé",
		badge: "badge-success",
		color: "var(--success)",
	},
	{
		value: "archived",
		label: "Archivé",
		badge: "badge-light",
		color: "#95a5a6",
	},
] as const;

const STATUS_MAP: Record<
	string,
	{ label: string; badge: string; color: string }
> = {};
for (const s of STATUS_OPTIONS) STATUS_MAP[s.value] = s;

/** Fallback for unknown statuses */
function getStatusInfo(status: string) {
	return (
		STATUS_MAP[status] ?? {
			label: status,
			badge: "badge-light",
			color: "var(--text-muted)",
		}
	);
}

/** Kanban column order — derived from shared KanbanColumns constant */
const KANBAN_COLUMNS = KanbanColumns;

const EVENT_TYPE_LABEL: Record<string, string> = EventTypeLabels;
const EVENT_TYPE_COLOR: Record<string, string> = {
	meeting: "#2e4a8a",
	call: "#27ae60",
	call_urgent: "#e74c3c",
	deadline: "#c0392b",
	reminder: "#b8923a",
	personal: "#8e44ad",
	other: "#666680",
};

const PROJECT_COLORS = ProjectColors;

const DETAIL_TABS = [
	{ key: "overview" as const, label: "Apercu" },
	{ key: "tasks" as const, label: "Taches" },
	{ key: "calendar" as const, label: "Calendrier" },
	{ key: "members" as const, label: "Membres" },
	{ key: "files" as const, label: "Fichiers" },
];

type DetailTab = (typeof DETAIL_TABS)[number]["key"];

const INITIAL_FORM = {
	emoji: DefaultValues.project.emoji as string,
	name: "",
	description: "",
	status: ProjectStatuses.Active as string,
	priority: Priorities.Medium as string,
	color: ProjectColors[0] as string,
	members: [] as number[],
	startDate: "",
	endDate: "",
	budget: "",
};

/* ================================================================
   Helper functions
   ================================================================ */

function formatDate(d: string | Date): string {
	return new Date(d).toLocaleDateString("fr-FR", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	});
}

function formatDateLong(d: string | Date): string {
	return new Date(d).toLocaleDateString("fr-FR", {
		day: "numeric",
		month: "long",
		year: "numeric",
	});
}

function formatDateShort(d: string | Date): string {
	return new Date(d).toLocaleDateString("fr-FR", {
		day: "numeric",
		month: "short",
	});
}

function isOverdue(t: Task): boolean {
	if (!t.dueDate || t.status === "realisee" || t.cancelled) return false;
	return new Date(t.dueDate) < new Date();
}

function getProgress(p: Project): number {
	if (!p.taskCount || p.taskCount === 0) return 0;
	return Math.round(((p.completedTaskCount ?? 0) / p.taskCount) * 100);
}

function daysUntil(date: string | Date): number {
	const now = new Date();
	now.setHours(0, 0, 0, 0);
	const target = new Date(date);
	target.setHours(0, 0, 0, 0);
	return Math.ceil(
		(target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
	);
}

function getProjectColor(project: Project): string {
	return PROJECT_COLORS[project.id % PROJECT_COLORS.length];
}

function getNextDeadline(tasks: Task[]): Task | null {
	const now = new Date();
	const upcoming = tasks
		.filter(
			(t) =>
				t.dueDate &&
				!t.completed &&
				!t.cancelled &&
				new Date(t.dueDate) >= now,
		)
		.sort(
			(a, b) =>
				new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime(),
		);
	return upcoming[0] || null;
}

/* ================================================================
   SVG Icon helpers (inline, matching existing pattern)
   ================================================================ */

function IconClose({ size = 16 }: { size?: number }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2">
			<line x1="18" y1="6" x2="6" y2="18" />
			<line x1="6" y1="6" x2="18" y2="18" />
		</svg>
	);
}

function IconPlus({ size = 14 }: { size?: number }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2.5">
			<line x1="12" y1="5" x2="12" y2="19" />
			<line x1="5" y1="12" x2="19" y2="12" />
		</svg>
	);
}

function IconEdit({ size = 13 }: { size?: number }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2">
			<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
			<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
		</svg>
	);
}

function IconTrash({ size = 13 }: { size?: number }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2">
			<polyline points="3 6 5 6 21 6" />
			<path d="M19 6l-1 14H6L5 6" />
		</svg>
	);
}

function IconProject({ size = 20 }: { size?: number }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2">
			<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
			<path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
		</svg>
	);
}

function IconCalendar({ size = 14 }: { size?: number }) {
	return (
		<svg
			width={size}
			height={size}
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

function IconUsers({ size = 14 }: { size?: number }) {
	return (
		<svg
			width={size}
			height={size}
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

function IconFile({ size = 14 }: { size?: number }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2">
			<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
			<polyline points="14 2 14 8 20 8" />
		</svg>
	);
}

function IconCheck({ size = 14 }: { size?: number }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2.5">
			<polyline points="20 6 9 17 4 12" />
		</svg>
	);
}

function IconClock({ size = 14 }: { size?: number }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2">
			<circle cx="12" cy="12" r="10" />
			<polyline points="12 6 12 12 16 14" />
		</svg>
	);
}

function IconAlert({ size = 14 }: { size?: number }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2">
			<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
			<line x1="12" y1="9" x2="12" y2="13" />
			<line x1="12" y1="17" x2="12.01" y2="17" />
		</svg>
	);
}

function IconTarget({ size = 14 }: { size?: number }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2">
			<circle cx="12" cy="12" r="10" />
			<circle cx="12" cy="12" r="6" />
			<circle cx="12" cy="12" r="2" />
		</svg>
	);
}

function IconList({ size = 14 }: { size?: number }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2">
			<line x1="8" y1="6" x2="21" y2="6" />
			<line x1="8" y1="12" x2="21" y2="12" />
			<line x1="8" y1="18" x2="21" y2="18" />
			<line x1="3" y1="6" x2="3.01" y2="6" />
			<line x1="3" y1="12" x2="3.01" y2="12" />
			<line x1="3" y1="18" x2="3.01" y2="18" />
		</svg>
	);
}

function IconGrid({ size = 14 }: { size?: number }) {
	return (
		<svg
			width={size}
			height={size}
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

function IconSearch({ size = 14 }: { size?: number }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2">
			<circle cx="11" cy="11" r="8" />
			<line x1="21" y1="21" x2="16.65" y2="16.65" />
		</svg>
	);
}

function IconEye({ size = 14 }: { size?: number }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2">
			<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
			<circle cx="12" cy="12" r="3" />
		</svg>
	);
}

/* ================================================================
   Progress Bar sub-component
   ================================================================ */

function ProgressBar({
	value,
	height = 6,
	showLabel = false,
}: {
	value: number;
	height?: number;
	showLabel?: boolean;
}) {
	return (
		<div>
			{showLabel && (
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						fontSize: "0.72rem",
						color: "var(--text-muted)",
						marginBottom: "0.3rem",
					}}>
					<span>Progression</span>
					<span>{value}%</span>
				</div>
			)}
			<div
				style={{
					height: `${height}px`,
					background: "var(--bg-alt)",
					borderRadius: "999px",
					overflow: "hidden",
				}}>
				<div
					style={{
						height: "100%",
						width: `${value}%`,
						background:
							value === 100
								? "var(--success)"
								: value > 60
									? "var(--accent)"
									: value > 30
										? "var(--warning)"
										: "var(--danger)",
						borderRadius: "999px",
						transition: "width 0.4s ease",
					}}
				/>
			</div>
		</div>
	);
}

/* ================================================================
   Member Avatar sub-component
   ================================================================ */

function MemberAvatar({
	member,
	size = 26,
	offset = false,
	color,
}: {
	member: Pick<User, "id" | "name" | "avatar">;
	size?: number;
	offset?: boolean;
	color?: string;
}) {
	return (
		<div
			title={member.name}
			style={{
				width: `${size}px`,
				height: `${size}px`,
				background: color || "#2e4a8a",
				borderRadius: `${Math.round(size * 0.27)}px`,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				fontSize: `${size * 0.027}rem`,
				color: "#fff",
				fontWeight: 700,
				marginLeft: offset ? "-6px" : 0,
				border: "2px solid var(--card-bg)",
				flexShrink: 0,
			}}>
			{member.avatar && member.avatar !== "?"
				? member.avatar
				: member.name.charAt(0).toUpperCase()}
		</div>
	);
}

/* ================================================================
   Member Avatars Row sub-component
   ================================================================ */

function MemberAvatarsRow({
	members,
	max = 4,
	size = 26,
}: {
	members: Pick<User, "id" | "name" | "avatar">[];
	max?: number;
	size?: number;
}) {
	const shown = members.slice(0, max);
	const remaining = members.length - max;
	return (
		<div style={{ display: "flex", alignItems: "center" }}>
			{shown.map((m, i) => (
				<MemberAvatar
					key={m.id}
					member={m}
					size={size}
					offset={i > 0}
				/>
			))}
			{remaining > 0 && (
				<div
					style={{
						width: `${size}px`,
						height: `${size}px`,
						background: "var(--bg-alt)",
						borderRadius: `${Math.round(size * 0.27)}px`,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						fontSize: "0.65rem",
						color: "var(--text-muted)",
						marginLeft: "-6px",
						border: "2px solid var(--card-bg)",
					}}>
					+{remaining}
				</div>
			)}
		</div>
	);
}

/* ================================================================
   Main Page Component
   ================================================================ */

export default function ProjectsPage() {
	const { user } = useAuth();
	const { showToast } = useToast();
	const confirm = useConfirm();

	/* ── Data state ── */
	const [projects, setProjects] = useState<Project[]>([]);
	const [users, setUsers] = useState<User[]>([]);
	const [loading, setLoading] = useState(true);

	/* ── View state ── */
	const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState("all");

	/* ── Create/Edit modal ── */
	const [showModal, setShowModal] = useState(false);
	const [editMode, setEditMode] = useState(false);
	const [editTarget, setEditTarget] = useState<Project | null>(null);
	const [form, setForm] = useState(INITIAL_FORM);
	const [saving, setSaving] = useState(false);

	/* ── Detail modal ── */
	const [selectedProject, setSelectedProject] = useState<Project | null>(
		null,
	);
	const [detailTab, setDetailTab] = useState<DetailTab>("overview");
	const [projectTasks, setProjectTasks] = useState<Task[]>([]);
	const [projectEvents, setProjectEvents] = useState<Event[]>([]);
	const [detailLoading, setDetailLoading] = useState(false);
	const [taskStatusFilter, setTaskStatusFilter] = useState("all");
	const [taskViewMode, setTaskViewMode] = useState<"list" | "kanban">("list");

	/* ================================================================
	   Data Loading
	   ================================================================ */

	const load = useCallback(async () => {
		setLoading(true);
		try {
			const data = await api.get<Project[]>("/projects");
			setProjects(data);
		} catch {
			showToast("Erreur de chargement", "error");
		} finally {
			setLoading(false);
		}
	}, [showToast]);

	const loadUsers = useCallback(async () => {
		try {
			const data = await api.get<User[]>("/users");
			setUsers(data);
		} catch {
			/* silent */
		}
	}, []);

	useEffect(() => {
		load();
	}, [load]);
	useEffect(() => {
		loadUsers();
	}, [loadUsers]);

	/**
	 * Load full detail data for a project (tasks + events)
	 */
	const loadProjectDetail = useCallback(async (projectId: number) => {
		setDetailLoading(true);
		try {
			const [tasks, allEvents] = await Promise.all([
				api.get<Task[]>(`/tasks?projectId=${projectId}`),
				api.get<Event[]>("/events"),
			]);
			setProjectTasks(tasks);
			setProjectEvents(
				allEvents.filter((e) => e.projectId === projectId),
			);
		} catch {
			/* silent - use empty data */
		} finally {
			setDetailLoading(false);
		}
	}, []);

	/* ================================================================
	   Computed values
	   ================================================================ */

	const filteredProjects = useMemo(() => {
		return projects.filter((p) => {
			if (statusFilter !== "all" && p.status !== statusFilter)
				return false;
			if (search) {
				const q = search.toLowerCase();
				return (
					p.name.toLowerCase().includes(q) ||
					(p.description || "").toLowerCase().includes(q)
				);
			}
			return true;
		});
	}, [projects, statusFilter, search]);

	const stats = useMemo(() => {
		const total = projects.length;
		const active = projects.filter((p) => p.status === "active").length;
		const completed = projects.filter(
			(p) => p.status === "completed",
		).length;
		const completionRate =
			total > 0 ? Math.round((completed / total) * 100) : 0;
		/** Count overdue tasks across all projects */
		const allTaskCounts = projects.reduce(
			(sum, p) => sum + (p.taskCount ?? 0),
			0,
		);
		const allCompletedCounts = projects.reduce(
			(sum, p) => sum + (p.completedTaskCount ?? 0),
			0,
		);
		return {
			total,
			active,
			completionRate,
			totalTasks: allTaskCounts,
			completedTasks: allCompletedCounts,
		};
	}, [projects]);

	/** Filtered tasks for the detail modal tasks tab */
	const filteredDetailTasks = useMemo(() => {
		if (taskStatusFilter === "all") return projectTasks;
		return projectTasks.filter((t) => t.status === taskStatusFilter);
	}, [projectTasks, taskStatusFilter]);

	/** Kanban grouped tasks */
	const kanbanData = useMemo(() => {
		const groups: Record<string, Task[]> = {};
		for (const col of KANBAN_COLUMNS) groups[col.key] = [];
		for (const t of projectTasks) {
			if (groups[t.status]) groups[t.status].push(t);
			else if (groups.en_attente) groups.en_attente.push(t);
		}
		return groups;
	}, [projectTasks]);

	/** Timeline items (events + task deadlines) sorted by date */
	const timelineItems = useMemo(() => {
		const items: {
			id: string;
			date: Date;
			title: string;
			type: "event" | "deadline";
			color: string;
			detail: string;
			eventType?: string;
		}[] = [];

		for (const ev of projectEvents) {
			items.push({
				id: `event-${ev.id}`,
				date: new Date(ev.date),
				title: ev.title,
				type: "event",
				color: EVENT_TYPE_COLOR[ev.type] || "#666680",
				detail: EVENT_TYPE_LABEL[ev.type] || ev.type,
				eventType: ev.type,
			});
		}

		for (const t of projectTasks) {
			if (t.dueDate) {
				items.push({
					id: `task-${t.id}`,
					date: new Date(t.dueDate),
					title: t.title,
					type: "deadline",
					color: t.completed
						? "var(--success)"
						: isOverdue(t)
							? "var(--danger)"
							: "var(--warning)",
					detail: t.completed
						? "Terminee"
						: isOverdue(t)
							? "En retard"
							: `Dans ${daysUntil(t.dueDate)} jour${daysUntil(t.dueDate) !== 1 ? "s" : ""}`,
				});
			}
		}

		items.sort((a, b) => a.date.getTime() - b.date.getTime());
		return items;
	}, [projectEvents, projectTasks]);

	/** Task stats for the detail modal */
	const detailTaskStats = useMemo(() => {
		const total = projectTasks.length;
		const completed = projectTasks.filter(
			(t) => t.completed || t.status === "realisee",
		).length;
		const inProgress = projectTasks.filter(
			(t) => t.status === "en_cours",
		).length;
		const overdue = projectTasks.filter(isOverdue).length;
		const blocked = projectTasks.filter(
			(t) => t.status === "bloquee",
		).length;
		return { total, completed, inProgress, overdue, blocked };
	}, [projectTasks]);

	/** Member task counts for the members tab */
	const memberTaskCounts = useMemo(() => {
		const counts: Record<number, { total: number; completed: number }> = {};
		for (const t of projectTasks) {
			if (t.assigneeId) {
				if (!counts[t.assigneeId])
					counts[t.assigneeId] = { total: 0, completed: 0 };
				counts[t.assigneeId].total++;
				if (t.completed || t.status === "realisee")
					counts[t.assigneeId].completed++;
			}
		}
		return counts;
	}, [projectTasks]);

	/* ================================================================
	   Event Handlers
	   ================================================================ */

	const openCreate = () => {
		setEditMode(false);
		setEditTarget(null);
		setForm(INITIAL_FORM);
		setShowModal(true);
	};

	const openEdit = (p: Project, e?: React.MouseEvent) => {
		if (e) e.stopPropagation();
		setEditMode(true);
		setEditTarget(p);
		setForm({
			emoji: p.emoji || "",
			name: p.name,
			description: p.description || "",
			status: p.status,
			priority: p.priority || "medium",
			color: getProjectColor(p),
			members: p.members || [],
			startDate: "",
			endDate: "",
			budget: "",
		});
		setShowModal(true);
	};

	const openDetail = (project: Project) => {
		setSelectedProject(project);
		setDetailTab("overview");
		setTaskStatusFilter("all");
		setTaskViewMode("list");
		loadProjectDetail(project.id);
	};

	const closeDetail = () => {
		setSelectedProject(null);
		setProjectTasks([]);
		setProjectEvents([]);
	};

	const toggleMember = (userId: number) => {
		setForm((f) => ({
			...f,
			members: f.members.includes(userId)
				? f.members.filter((id) => id !== userId)
				: [...f.members, userId],
		}));
	};

	const handleSave = async () => {
		if (!form.name.trim()) {
			showToast("Nom requis", "error");
			return;
		}
		setSaving(true);
		try {
			const payload = {
				emoji: form.emoji || null,
				name: form.name.trim(),
				description: form.description || null,
				status: form.status,
				priority: form.priority,
				members: form.members,
			};
			if (editMode && editTarget) {
				await api.put(`/projects/${editTarget.id}`, payload);
				showToast("Projet modifie", "success");
			} else {
				await api.post("/projects", payload);
				showToast("Projet cree", "success");
			}
			setShowModal(false);
			load();
			if (selectedProject && editMode && editTarget) {
				const updatedProjects = await api.get<Project[]>("/projects");
				const updated = updatedProjects.find(
					(p) => p.id === editTarget.id,
				);
				if (updated) setSelectedProject(updated);
			}
		} catch (e) {
			showToast((e as Error).message, "error");
		} finally {
			setSaving(false);
		}
	};

	const handleDelete = async (p: Project, e?: React.MouseEvent) => {
		if (e) e.stopPropagation();
		const ok = await confirm({
			title: "Supprimer le projet",
			message: `Supprimer "${p.name}" ? Les taches associees seront orphelines.`,
			confirmLabel: "Supprimer",
			danger: true,
		});
		if (!ok) return;
		try {
			await api.delete(`/projects/${p.id}`);
			showToast("Projet supprime", "success");
			if (selectedProject?.id === p.id) closeDetail();
			load();
		} catch (e) {
			showToast((e as Error).message, "error");
		}
	};

	/* ================================================================
	   Render
	   ================================================================ */

	return (
		<div
			style={{
				height: "calc(100vh - 4rem)",
				overflowY: "auto",
				paddingRight: "0.25rem",
			}}>
			{/* ─── Page Header ─── */}
			<div className="page-header-box">
				<div className="phb-left">
					<div className="phb-icon">
						<IconProject />
					</div>
					<div className="phb-text">
						<h1>Projets</h1>
						<p className="page-description">
							Gestion des projets et equipes
						</p>
					</div>
				</div>
				<div className="page-header-box-actions">
					{/* View toggle */}
					<div
						style={{
							display: "flex",
							gap: "0.25rem",
							background: "var(--bg-alt)",
							borderRadius: "8px",
							padding: "0.25rem",
						}}>
						{(["cards", "table"] as const).map((v) => (
							<button
								key={v}
								onClick={() => setViewMode(v)}
								style={{
									padding: "0.35rem 0.75rem",
									borderRadius: "6px",
									border: "none",
									background:
										viewMode === v
											? "var(--card-bg)"
											: "transparent",
									color:
										viewMode === v
											? "var(--accent)"
											: "var(--text-muted)",
									fontWeight: viewMode === v ? 700 : 400,
									fontSize: "0.8rem",
									cursor: "pointer",
								}}>
								{v === "cards" ? "Cartes" : "Tableau"}
							</button>
						))}
					</div>
					<button className="btn-primary btn-sm" onClick={openCreate}>
						<IconPlus />
						Nouveau projet
					</button>
				</div>
			</div>

			{/* ─── Filter Bar ─── */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: "0.75rem",
					marginBottom: "1rem",
					flexWrap: "wrap",
				}}>
				{/* Search */}
				<div
					style={{
						position: "relative",
						flex: "1 1 200px",
						maxWidth: "320px",
					}}>
					<div
						style={{
							position: "absolute",
							left: "0.75rem",
							top: "50%",
							transform: "translateY(-50%)",
							color: "var(--text-muted)",
							display: "flex",
						}}>
						<IconSearch />
					</div>
					<input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Rechercher un projet..."
						style={{
							paddingLeft: "2.25rem",
							width: "100%",
							height: "36px",
							border: "1.5px solid var(--border-color)",
							borderRadius: "8px",
							background: "var(--card-bg)",
							color: "var(--text)",
							fontSize: "0.82rem",
						}}
					/>
				</div>

				{/* Status filter pills */}
				<div
					style={{
						display: "flex",
						gap: "0.3rem",
						flexWrap: "wrap",
					}}>
					<button
						onClick={() => setStatusFilter("all")}
						style={{
							padding: "0.3rem 0.7rem",
							borderRadius: "6px",
							border:
								statusFilter === "all"
									? "1.5px solid var(--accent)"
									: "1.5px solid var(--border-color)",
							background:
								statusFilter === "all"
									? "var(--accent)"
									: "transparent",
							color:
								statusFilter === "all"
									? "#fff"
									: "var(--text-muted)",
							fontSize: "0.75rem",
							fontWeight: statusFilter === "all" ? 600 : 400,
							cursor: "pointer",
						}}>
						Tous ({projects.length})
					</button>
					{STATUS_OPTIONS.map((s) => {
						const count = projects.filter(
							(p) => p.status === s.value,
						).length;
						if (count === 0 && statusFilter !== s.value)
							return null;
						return (
							<button
								key={s.value}
								onClick={() => setStatusFilter(s.value)}
								style={{
									padding: "0.3rem 0.7rem",
									borderRadius: "6px",
									border:
										statusFilter === s.value
											? `1.5px solid ${s.color}`
											: "1.5px solid var(--border-color)",
									background:
										statusFilter === s.value
											? s.color
											: "transparent",
									color:
										statusFilter === s.value
											? "#fff"
											: "var(--text-muted)",
									fontSize: "0.75rem",
									fontWeight:
										statusFilter === s.value ? 600 : 400,
									cursor: "pointer",
								}}>
								{s.label} ({count})
							</button>
						);
					})}
				</div>
			</div>

			{/* ─── Cards View ─── */}
			{viewMode === "cards" &&
				(loading ? (
					<div className="empty-state">
						<p>Chargement...</p>
					</div>
				) : filteredProjects.length === 0 ? (
					<div className="empty-state">
						<h4>Aucun projet</h4>
						<p
							style={{
								color: "var(--text-muted)",
								fontSize: "0.85rem",
							}}>
							{search || statusFilter !== "all"
								? "Aucun projet ne correspond aux filtres"
								: "Creez votre premier projet"}
						</p>
					</div>
				) : (
					<div
						style={{
							display: "grid",
							gridTemplateColumns:
								"repeat(auto-fill, minmax(300px, 1fr))",
							gap: "1rem",
						}}>
						{filteredProjects.map((p) => {
							const progress = getProgress(p);
							const pColor = getProjectColor(p);
							const statusInfo = getStatusInfo(p.status);
							return (
								<div
									key={p.id}
									className="card"
									style={{
										cursor: "pointer",
										borderLeft: `3px solid ${pColor}`,
										transition:
											"transform 0.15s, box-shadow 0.15s",
									}}
									onClick={() => openDetail(p)}
									onMouseEnter={(e) => {
										(
											e.currentTarget as HTMLElement
										).style.transform = "translateY(-2px)";
										(
											e.currentTarget as HTMLElement
										).style.boxShadow =
											"0 4px 12px rgba(0,0,0,0.08)";
									}}
									onMouseLeave={(e) => {
										(
											e.currentTarget as HTMLElement
										).style.transform = "none";
										(
											e.currentTarget as HTMLElement
										).style.boxShadow = "none";
									}}>
									{/* Card header */}
									<div
										style={{
											display: "flex",
											alignItems: "flex-start",
											gap: "0.75rem",
											marginBottom: "0.75rem",
										}}>
										<div
											style={{
												width: "42px",
												height: "42px",
												background: `linear-gradient(135deg, ${pColor}, ${pColor}88)`,
												borderRadius: "10px",
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												fontSize: "1.3rem",
												flexShrink: 0,
											}}>
											{p.emoji || "\uD83D\uDCC1"}
										</div>
										<div
											style={{
												flex: 1,
												minWidth: 0,
											}}>
											<div
												style={{
													fontWeight: 700,
													fontSize: "0.95rem",
													whiteSpace: "nowrap",
													overflow: "hidden",
													textOverflow: "ellipsis",
													color: "var(--text)",
												}}>
												{p.name}
											</div>
											<div
												style={{
													display: "flex",
													alignItems: "center",
													gap: "0.4rem",
													marginTop: "0.2rem",
												}}>
												<span
													className={`badge ${statusInfo.badge}`}
													style={{
														fontSize: "0.68rem",
													}}>
													{statusInfo.label}
												</span>
												{p.priority && (
													<span
														className={`badge ${PriorityBadges[p.priority] || "badge-light"}`}
														style={{
															fontSize: "0.65rem",
														}}>
														{PriorityLabels[
															p.priority
														] || p.priority}
													</span>
												)}
											</div>
										</div>
										{/* Quick actions */}
										<div
											style={{
												display: "flex",
												gap: "0.2rem",
											}}
											onClick={(e) =>
												e.stopPropagation()
											}>
											<button
												className="btn-icon"
												onClick={(e) => openEdit(p, e)}
												title="Modifier"
												style={{
													width: "28px",
													height: "28px",
												}}>
												<IconEdit size={12} />
											</button>
											<button
												className="btn-icon delete"
												onClick={(e) =>
													handleDelete(p, e)
												}
												title="Supprimer"
												style={{
													width: "28px",
													height: "28px",
												}}>
												<IconTrash size={12} />
											</button>
										</div>
									</div>

									{/* Description */}
									{p.description && (
										<p
											style={{
												margin: "0 0 0.75rem",
												fontSize: "0.8rem",
												color: "var(--text-secondary)",
												overflow: "hidden",
												display: "-webkit-box",
												WebkitLineClamp: 2,
												WebkitBoxOrient: "vertical",
												lineHeight: 1.4,
											}}>
											{p.description}
										</p>
									)}

									{/* Progress bar */}
									<div style={{ marginBottom: "0.75rem" }}>
										<div
											style={{
												display: "flex",
												justifyContent: "space-between",
												fontSize: "0.72rem",
												color: "var(--text-muted)",
												marginBottom: "0.3rem",
											}}>
											<span>Progression</span>
											<span>
												{progress}% (
												{p.completedTaskCount ?? 0}/
												{p.taskCount ?? 0})
											</span>
										</div>
										<ProgressBar value={progress} />
									</div>

									{/* Footer: avatars + task count */}
									<div
										style={{
											display: "flex",
											alignItems: "center",
											justifyContent: "space-between",
										}}>
										<MemberAvatarsRow
											members={p.membersData || []}
											max={4}
											size={26}
										/>
										<div
											style={{
												display: "flex",
												alignItems: "center",
												gap: "0.5rem",
											}}>
											<span
												style={{
													fontSize: "0.72rem",
													color: "var(--text-muted)",
												}}>
												{p.taskCount ?? 0} tache
												{(p.taskCount ?? 0) !== 1
													? "s"
													: ""}
											</span>
										</div>
									</div>
								</div>
							);
						})}
					</div>
				))}

			{/* ─── Table View ─── */}
			{viewMode === "table" && (
				<div
					className="card"
					style={{ padding: 0, overflow: "hidden" }}>
					{loading ? (
						<div className="empty-state">
							<p>Chargement...</p>
						</div>
					) : filteredProjects.length === 0 ? (
						<div className="empty-state">
							<h4>Aucun projet</h4>
						</div>
					) : (
						<div style={{ overflowX: "auto" }}>
							<table className="data-table">
								<thead>
									<tr>
										<th>Projet</th>
										<th>Statut</th>
										<th>Priorite</th>
										<th>Progression</th>
										<th>Taches</th>
										<th>Membres</th>
										<th>Cree le</th>
										<th style={{ textAlign: "right" }}>
											Actions
										</th>
									</tr>
								</thead>
								<tbody>
									{filteredProjects.map((p) => {
										const progress = getProgress(p);
										const pColor = getProjectColor(p);
										const statusInfo = getStatusInfo(
											p.status,
										);
										return (
											<tr
												key={p.id}
												style={{ cursor: "pointer" }}
												onClick={() => openDetail(p)}>
												<td>
													<div
														style={{
															display: "flex",
															alignItems:
																"center",
															gap: "0.6rem",
														}}>
														<div
															style={{
																width: "32px",
																height: "32px",
																background: `linear-gradient(135deg, ${pColor}, ${pColor}88)`,
																borderRadius:
																	"8px",
																display: "flex",
																alignItems:
																	"center",
																justifyContent:
																	"center",
																fontSize:
																	"1rem",
																flexShrink: 0,
															}}>
															{p.emoji ||
																"\uD83D\uDCC1"}
														</div>
														<span
															style={{
																fontWeight: 700,
																fontSize:
																	"0.875rem",
															}}>
															{p.name}
														</span>
													</div>
												</td>
												<td>
													<span
														className={`badge ${statusInfo.badge}`}
														style={{
															fontSize: "0.7rem",
														}}>
														{statusInfo.label}
													</span>
												</td>
												<td>
													<span
														className={`badge ${PriorityBadges[p.priority] || "badge-light"}`}
														style={{
															fontSize: "0.7rem",
														}}>
														{PriorityLabels[
															p.priority
														] || "Moyen"}
													</span>
												</td>
												<td>
													<div
														style={{
															display: "flex",
															alignItems:
																"center",
															gap: "0.5rem",
															minWidth: "120px",
														}}>
														<div
															style={{
																flex: 1,
															}}>
															<ProgressBar
																value={progress}
																height={5}
															/>
														</div>
														<span
															style={{
																fontSize:
																	"0.75rem",
																color: "var(--text-muted)",
																whiteSpace:
																	"nowrap",
															}}>
															{progress}%
														</span>
													</div>
												</td>
												<td
													style={{
														fontSize: "0.82rem",
													}}>
													{p.completedTaskCount ?? 0}/
													{p.taskCount ?? 0}
												</td>
												<td>
													<MemberAvatarsRow
														members={
															p.membersData || []
														}
														max={3}
														size={24}
													/>
												</td>
												<td
													style={{
														fontSize: "0.8rem",
														color: "var(--text-muted)",
													}}>
													{formatDate(p.createdAt)}
												</td>
												<td>
													<div
														style={{
															display: "flex",
															justifyContent:
																"flex-end",
															gap: "0.3rem",
														}}
														onClick={(e) =>
															e.stopPropagation()
														}>
														<button
															className="btn-icon"
															onClick={(e) =>
																openEdit(p, e)
															}
															title="Modifier">
															<IconEdit />
														</button>
														<button
															className="btn-icon delete"
															onClick={(e) =>
																handleDelete(
																	p,
																	e,
																)
															}
															title="Supprimer">
															<IconTrash />
														</button>
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
			)}

			{/* ================================================================
			   Detail Modal
			   ================================================================ */}
			{selectedProject && (
				<div className="modal-overlay" onClick={closeDetail}>
					<div
						className="modal-content"
						style={{
							maxWidth: "920px",
							width: "95vw",
							maxHeight: "88vh",
							display: "flex",
							flexDirection: "column",
							overflow: "hidden",
						}}
						onClick={(e) => e.stopPropagation()}>
						{/* ── Detail Header ── */}
						<div
							className="modal-header"
							style={{
								borderBottom: "1px solid var(--border-color)",
								padding: "1.25rem 1.5rem 1rem",
							}}>
							<div
								style={{
									display: "flex",
									alignItems: "center",
									gap: "1rem",
									flex: 1,
								}}>
								<div
									style={{
										width: "48px",
										height: "48px",
										background: `linear-gradient(135deg, ${getProjectColor(selectedProject)}, ${getProjectColor(selectedProject)}88)`,
										borderRadius: "12px",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										fontSize: "1.5rem",
										flexShrink: 0,
									}}>
									{selectedProject.emoji || "\uD83D\uDCC1"}
								</div>
								<div style={{ flex: 1, minWidth: 0 }}>
									<h3
										style={{
											margin: "0 0 0.3rem",
											fontSize: "1.15rem",
											fontWeight: 700,
										}}>
										{selectedProject.name}
									</h3>
									<div
										style={{
											display: "flex",
											alignItems: "center",
											gap: "0.5rem",
											flexWrap: "wrap",
										}}>
										<span
											className={`badge ${getStatusInfo(selectedProject.status).badge}`}
											style={{ fontSize: "0.72rem" }}>
											{
												getStatusInfo(
													selectedProject.status,
												).label
											}
										</span>
										{selectedProject.priority && (
											<span
												className={`badge ${PriorityBadges[selectedProject.priority] || "badge-light"}`}
												style={{
													fontSize: "0.68rem",
												}}>
												{PriorityLabels[
													selectedProject.priority
												] || "Moyen"}
											</span>
										)}
										<span
											style={{
												fontSize: "0.75rem",
												color: "var(--text-muted)",
											}}>
											Cree le{" "}
											{formatDateLong(
												selectedProject.createdAt,
											)}
										</span>
									</div>
								</div>
								<div
									style={{
										display: "flex",
										gap: "0.4rem",
										flexShrink: 0,
									}}>
									<button
										className="btn-secondary btn-sm"
										onClick={() =>
											openEdit(selectedProject)
										}>
										<IconEdit size={12} />
										Modifier
									</button>
									<button
										className="btn-icon delete"
										onClick={(e) =>
											handleDelete(selectedProject, e)
										}
										title="Supprimer">
										<IconTrash size={14} />
									</button>
									<button
										className="btn-icon"
										onClick={closeDetail}>
										<IconClose />
									</button>
								</div>
							</div>
						</div>

						{/* ── Tab Bar ── */}
						<div
							style={{
								display: "flex",
								gap: "0",
								borderBottom: "1px solid var(--border-color)",
								padding: "0 1.5rem",
								background: "var(--card-bg)",
							}}>
							{DETAIL_TABS.map((tab) => (
								<button
									key={tab.key}
									onClick={() => setDetailTab(tab.key)}
									style={{
										padding: "0.75rem 1rem",
										border: "none",
										borderBottom:
											detailTab === tab.key
												? "2px solid var(--accent)"
												: "2px solid transparent",
										background: "transparent",
										color:
											detailTab === tab.key
												? "var(--accent)"
												: "var(--text-muted)",
										fontWeight:
											detailTab === tab.key ? 700 : 400,
										fontSize: "0.82rem",
										cursor: "pointer",
										transition: "all 0.15s",
										display: "flex",
										alignItems: "center",
										gap: "0.4rem",
									}}>
									{tab.key === "overview" && (
										<IconEye size={13} />
									)}
									{tab.key === "tasks" && (
										<IconList size={13} />
									)}
									{tab.key === "calendar" && (
										<IconCalendar size={13} />
									)}
									{tab.key === "members" && (
										<IconUsers size={13} />
									)}
									{tab.key === "files" && (
										<IconFile size={13} />
									)}
									{tab.label}
									{tab.key === "tasks" && (
										<span
											style={{
												background: "var(--bg-alt)",
												padding: "0.1rem 0.4rem",
												borderRadius: "4px",
												fontSize: "0.7rem",
												fontWeight: 600,
											}}>
											{projectTasks.length}
										</span>
									)}
									{tab.key === "members" && (
										<span
											style={{
												background: "var(--bg-alt)",
												padding: "0.1rem 0.4rem",
												borderRadius: "4px",
												fontSize: "0.7rem",
												fontWeight: 600,
											}}>
											{selectedProject.membersData
												?.length ?? 0}
										</span>
									)}
								</button>
							))}
						</div>

						{/* ── Tab Content ── */}
						<div
							style={{
								flex: 1,
								overflowY: "auto",
								padding: "1.25rem 1.5rem",
							}}>
							{detailLoading ? (
								<div
									style={{
										padding: "3rem",
										textAlign: "center",
										color: "var(--text-muted)",
									}}>
									Chargement...
								</div>
							) : (
								<>
									{/* ════════════════════════════════════
									    APERCU TAB
									    ════════════════════════════════════ */}
									{detailTab === "overview" && (
										<div>
											{/* Description */}
											{selectedProject.description && (
												<div
													style={{
														marginBottom: "1.5rem",
													}}>
													<h4
														style={{
															margin: "0 0 0.5rem",
															fontSize: "0.85rem",
															fontWeight: 700,
															color: "var(--text)",
														}}>
														Description
													</h4>
													<p
														style={{
															margin: 0,
															fontSize: "0.85rem",
															color: "var(--text-secondary)",
															lineHeight: 1.6,
														}}>
														{
															selectedProject.description
														}
													</p>
												</div>
											)}

											{/* Progress */}
											<div
												style={{
													marginBottom: "1.5rem",
												}}>
												<h4
													style={{
														margin: "0 0 0.6rem",
														fontSize: "0.85rem",
														fontWeight: 700,
													}}>
													Progression globale
												</h4>
												<div
													style={{
														background:
															"var(--bg-alt)",
														borderRadius: "12px",
														padding: "1rem 1.25rem",
													}}>
													<div
														style={{
															display: "flex",
															justifyContent:
																"space-between",
															marginBottom:
																"0.5rem",
														}}>
														<span
															style={{
																fontSize:
																	"1.5rem",
																fontWeight: 800,
																color: "var(--text)",
															}}>
															{getProgress(
																selectedProject,
															)}
															%
														</span>
														<span
															style={{
																fontSize:
																	"0.82rem",
																color: "var(--text-muted)",
																alignSelf:
																	"flex-end",
															}}>
															{selectedProject.completedTaskCount ??
																0}{" "}
															/{" "}
															{selectedProject.taskCount ??
																0}{" "}
															taches terminees
														</span>
													</div>
													<ProgressBar
														value={getProgress(
															selectedProject,
														)}
														height={10}
													/>
												</div>
											</div>

											{/* Key stats grid */}
											<div
												style={{
													display: "grid",
													gridTemplateColumns:
														"repeat(auto-fit, minmax(140px, 1fr))",
													gap: "0.75rem",
													marginBottom: "1.5rem",
												}}>
												<div
													style={{
														background:
															"var(--bg-alt)",
														borderRadius: "10px",
														padding: "0.85rem 1rem",
														textAlign: "center",
													}}>
													<div
														style={{
															fontSize: "1.3rem",
															fontWeight: 800,
															color: "var(--accent)",
														}}>
														{
															detailTaskStats.completed
														}
														/{detailTaskStats.total}
													</div>
													<div
														style={{
															fontSize: "0.72rem",
															color: "var(--text-muted)",
															marginTop: "0.2rem",
														}}>
														Taches terminees
													</div>
												</div>
												<div
													style={{
														background:
															"var(--bg-alt)",
														borderRadius: "10px",
														padding: "0.85rem 1rem",
														textAlign: "center",
													}}>
													<div
														style={{
															fontSize: "1.3rem",
															fontWeight: 800,
															color: "var(--accent)",
														}}>
														{
															detailTaskStats.inProgress
														}
													</div>
													<div
														style={{
															fontSize: "0.72rem",
															color: "var(--text-muted)",
															marginTop: "0.2rem",
														}}>
														En cours
													</div>
												</div>
												<div
													style={{
														background:
															"var(--bg-alt)",
														borderRadius: "10px",
														padding: "0.85rem 1rem",
														textAlign: "center",
													}}>
													<div
														style={{
															fontSize: "1.3rem",
															fontWeight: 800,
															color:
																detailTaskStats.overdue >
																0
																	? "var(--danger)"
																	: "var(--success)",
														}}>
														{
															detailTaskStats.overdue
														}
													</div>
													<div
														style={{
															fontSize: "0.72rem",
															color: "var(--text-muted)",
															marginTop: "0.2rem",
														}}>
														En retard
													</div>
												</div>
												<div
													style={{
														background:
															"var(--bg-alt)",
														borderRadius: "10px",
														padding: "0.85rem 1rem",
														textAlign: "center",
													}}>
													<div
														style={{
															fontSize: "1.3rem",
															fontWeight: 800,
															color: "var(--accent)",
														}}>
														{selectedProject
															.membersData
															?.length ?? 0}
													</div>
													<div
														style={{
															fontSize: "0.72rem",
															color: "var(--text-muted)",
															marginTop: "0.2rem",
														}}>
														Membres
													</div>
												</div>
												<div
													style={{
														background:
															"var(--bg-alt)",
														borderRadius: "10px",
														padding: "0.85rem 1rem",
														textAlign: "center",
													}}>
													<div
														style={{
															fontSize: "1.3rem",
															fontWeight: 800,
															color: "var(--accent)",
														}}>
														{projectEvents.length}
													</div>
													<div
														style={{
															fontSize: "0.72rem",
															color: "var(--text-muted)",
															marginTop: "0.2rem",
														}}>
														Evenements
													</div>
												</div>
												<div
													style={{
														background:
															"var(--bg-alt)",
														borderRadius: "10px",
														padding: "0.85rem 1rem",
														textAlign: "center",
													}}>
													<div
														style={{
															fontSize: "1.3rem",
															fontWeight: 800,
															color:
																detailTaskStats.blocked >
																0
																	? "var(--danger)"
																	: "var(--text-muted)",
														}}>
														{
															detailTaskStats.blocked
														}
													</div>
													<div
														style={{
															fontSize: "0.72rem",
															color: "var(--text-muted)",
															marginTop: "0.2rem",
														}}>
														Bloquees
													</div>
												</div>
											</div>

											{/* Members preview */}
											{(selectedProject.membersData
												?.length ?? 0) > 0 && (
												<div
													style={{
														marginBottom: "1.5rem",
													}}>
													<h4
														style={{
															margin: "0 0 0.6rem",
															fontSize: "0.85rem",
															fontWeight: 700,
														}}>
														Equipe
													</h4>
													<div
														style={{
															display: "flex",
															gap: "0.5rem",
															flexWrap: "wrap",
														}}>
														{(
															selectedProject.membersData ??
															[]
														).map((m) => (
															<div
																key={m.id}
																style={{
																	display:
																		"flex",
																	alignItems:
																		"center",
																	gap: "0.5rem",
																	background:
																		"var(--bg-alt)",
																	padding:
																		"0.4rem 0.75rem 0.4rem 0.4rem",
																	borderRadius:
																		"8px",
																}}>
																<MemberAvatar
																	member={m}
																	size={24}
																/>
																<span
																	style={{
																		fontSize:
																			"0.8rem",
																		fontWeight: 600,
																	}}>
																	{m.name}
																</span>
															</div>
														))}
													</div>
												</div>
											)}

											{/* Next deadline */}
											{(() => {
												const next =
													getNextDeadline(
														projectTasks,
													);
												if (!next) return null;
												const days = daysUntil(
													next.dueDate!,
												);
												return (
													<div
														style={{
															marginBottom:
																"1.5rem",
														}}>
														<h4
															style={{
																margin: "0 0 0.6rem",
																fontSize:
																	"0.85rem",
																fontWeight: 700,
															}}>
															Prochaine echeance
														</h4>
														<div
															style={{
																background:
																	days <= 2
																		? "rgba(231,76,60,0.08)"
																		: "var(--bg-alt)",
																borderRadius:
																	"10px",
																padding:
																	"0.85rem 1rem",
																display: "flex",
																alignItems:
																	"center",
																gap: "0.75rem",
																border:
																	days <= 2
																		? "1px solid rgba(231,76,60,0.2)"
																		: "none",
															}}>
															<div
																style={{
																	color:
																		days <=
																		2
																			? "var(--danger)"
																			: "var(--warning)",
																	display:
																		"flex",
																}}>
																<IconClock
																	size={18}
																/>
															</div>
															<div
																style={{
																	flex: 1,
																}}>
																<div
																	style={{
																		fontWeight: 600,
																		fontSize:
																			"0.85rem",
																	}}>
																	{next.title}
																</div>
																<div
																	style={{
																		fontSize:
																			"0.75rem",
																		color: "var(--text-muted)",
																	}}>
																	{formatDateLong(
																		next.dueDate!,
																	)}{" "}
																	-{" "}
																	{days === 0
																		? "Aujourd'hui"
																		: days ===
																			  1
																			? "Demain"
																			: `Dans ${days} jours`}
																</div>
															</div>
															{days <= 2 && (
																<div
																	style={{
																		color: "var(--danger)",
																		display:
																			"flex",
																	}}>
																	<IconAlert
																		size={
																			16
																		}
																	/>
																</div>
															)}
														</div>
													</div>
												);
											})()}
										</div>
									)}

									{/* ════════════════════════════════════
									    TACHES TAB
									    ════════════════════════════════════ */}
									{detailTab === "tasks" && (
										<div>
											{/* Task tab header */}
											<div
												style={{
													display: "flex",
													alignItems: "center",
													gap: "0.75rem",
													marginBottom: "1rem",
													flexWrap: "wrap",
												}}>
												{/* Status filter */}
												<select
													value={taskStatusFilter}
													onChange={(e) =>
														setTaskStatusFilter(
															e.target.value,
														)
													}
													style={{
														height: "34px",
														border: "1.5px solid var(--border-color)",
														borderRadius: "8px",
														background:
															"var(--card-bg)",
														color: "var(--text)",
														fontSize: "0.8rem",
														padding: "0 0.6rem",
													}}>
													<option value="all">
														Tous les statuts
													</option>
													{KANBAN_COLUMNS.map(
														(col) => (
															<option
																key={col.key}
																value={col.key}>
																{col.label}
															</option>
														),
													)}
												</select>

												<div style={{ flex: 1 }} />

												{/* View toggle */}
												<div
													style={{
														display: "flex",
														gap: "0.25rem",
														background:
															"var(--bg-alt)",
														borderRadius: "8px",
														padding: "0.2rem",
													}}>
													<button
														onClick={() =>
															setTaskViewMode(
																"list",
															)
														}
														style={{
															padding:
																"0.3rem 0.6rem",
															borderRadius: "6px",
															border: "none",
															background:
																taskViewMode ===
																"list"
																	? "var(--card-bg)"
																	: "transparent",
															color:
																taskViewMode ===
																"list"
																	? "var(--accent)"
																	: "var(--text-muted)",
															fontSize: "0.75rem",
															fontWeight:
																taskViewMode ===
																"list"
																	? 700
																	: 400,
															cursor: "pointer",
															display: "flex",
															alignItems:
																"center",
															gap: "0.3rem",
														}}>
														<IconList size={12} />
														Liste
													</button>
													<button
														onClick={() =>
															setTaskViewMode(
																"kanban",
															)
														}
														style={{
															padding:
																"0.3rem 0.6rem",
															borderRadius: "6px",
															border: "none",
															background:
																taskViewMode ===
																"kanban"
																	? "var(--card-bg)"
																	: "transparent",
															color:
																taskViewMode ===
																"kanban"
																	? "var(--accent)"
																	: "var(--text-muted)",
															fontSize: "0.75rem",
															fontWeight:
																taskViewMode ===
																"kanban"
																	? 700
																	: 400,
															cursor: "pointer",
															display: "flex",
															alignItems:
																"center",
															gap: "0.3rem",
														}}>
														<IconGrid size={12} />
														Kanban
													</button>
												</div>
											</div>

											{/* Task List View */}
											{taskViewMode === "list" && (
												<div>
													{filteredDetailTasks.length ===
													0 ? (
														<div
															style={{
																textAlign:
																	"center",
																padding: "2rem",
																color: "var(--text-muted)",
																fontSize:
																	"0.85rem",
																fontStyle:
																	"italic",
															}}>
															Aucune tache{" "}
															{taskStatusFilter !==
															"all"
																? "avec ce statut"
																: "dans ce projet"}
														</div>
													) : (
														<div
															style={{
																display: "flex",
																flexDirection:
																	"column",
																gap: "0.35rem",
															}}>
															{filteredDetailTasks.map(
																(t) => (
																	<div
																		key={
																			t.id
																		}
																		style={{
																			display:
																				"flex",
																			alignItems:
																				"center",
																			gap: "0.6rem",
																			padding:
																				"0.65rem 0.85rem",
																			background:
																				"var(--bg-alt)",
																			borderRadius:
																				"8px",
																			borderLeft: `3px solid ${TaskStatusColors[t.status] || "#95a5a6"}`,
																		}}>
																		<span
																			className={`badge ${TaskStatusBadges[t.status] || "badge-light"}`}
																			style={{
																				fontSize:
																					"0.65rem",
																				flexShrink: 0,
																				minWidth:
																					"60px",
																				textAlign:
																					"center",
																			}}>
																			{TaskStatusLabels[
																				t
																					.status
																			] ||
																				t.status}
																		</span>
																		<div
																			style={{
																				flex: 1,
																				minWidth: 0,
																			}}>
																			<div
																				style={{
																					fontWeight: 600,
																					fontSize:
																						"0.82rem",
																					whiteSpace:
																						"nowrap",
																					overflow:
																						"hidden",
																					textOverflow:
																						"ellipsis",
																					textDecoration:
																						t.completed
																							? "line-through"
																							: "none",
																					opacity:
																						t.completed
																							? 0.6
																							: 1,
																				}}>
																				{
																					t.title
																				}
																			</div>
																			{t.dueDate && (
																				<div
																					style={{
																						fontSize:
																							"0.72rem",
																						color: isOverdue(
																							t,
																						)
																							? "var(--danger)"
																							: "var(--text-muted)",
																						marginTop:
																							"0.15rem",
																						display:
																							"flex",
																						alignItems:
																							"center",
																						gap: "0.3rem",
																					}}>
																					<IconClock
																						size={
																							11
																						}
																					/>
																					{formatDateShort(
																						t.dueDate,
																					)}
																					{isOverdue(
																						t,
																					) &&
																						" (en retard)"}
																				</div>
																			)}
																		</div>
																		<span
																			className={`badge ${PriorityBadges[t.priority] || "badge-light"}`}
																			style={{
																				fontSize:
																					"0.62rem",
																				flexShrink: 0,
																			}}>
																			{PriorityLabels[
																				t
																					.priority
																			] ||
																				""}
																		</span>
																		{t.assignee && (
																			<MemberAvatar
																				member={
																					t.assignee
																				}
																				size={
																					22
																				}
																			/>
																		)}
																	</div>
																),
															)}
														</div>
													)}
												</div>
											)}

											{/* Task Kanban View */}
											{taskViewMode === "kanban" && (
												<div
													style={{
														display: "grid",
														gridTemplateColumns: `repeat(${KANBAN_COLUMNS.length}, 1fr)`,
														gap: "0.75rem",
														minHeight: "200px",
													}}>
													{KANBAN_COLUMNS.map(
														(col) => (
															<div
																key={col.key}
																style={{
																	background:
																		"var(--bg-alt)",
																	borderRadius:
																		"10px",
																	padding:
																		"0.75rem",
																	display:
																		"flex",
																	flexDirection:
																		"column",
																}}>
																{/* Column header */}
																<div
																	style={{
																		display:
																			"flex",
																		alignItems:
																			"center",
																		gap: "0.5rem",
																		marginBottom:
																			"0.75rem",
																		paddingBottom:
																			"0.5rem",
																		borderBottom: `2px solid ${col.color}`,
																	}}>
																	<div
																		style={{
																			width: "8px",
																			height: "8px",
																			borderRadius:
																				"50%",
																			background:
																				col.color,
																			flexShrink: 0,
																		}}
																	/>
																	<span
																		style={{
																			fontWeight: 700,
																			fontSize:
																				"0.78rem",
																			flex: 1,
																		}}>
																		{
																			col.label
																		}
																	</span>
																	<span
																		style={{
																			fontSize:
																				"0.7rem",
																			color: "var(--text-muted)",
																			background:
																				"var(--card-bg)",
																			padding:
																				"0.1rem 0.4rem",
																			borderRadius:
																				"4px",
																		}}>
																		{
																			(
																				kanbanData[
																					col
																						.key
																				] ||
																				[]
																			)
																				.length
																		}
																	</span>
																</div>
																{/* Column tasks */}
																<div
																	style={{
																		display:
																			"flex",
																		flexDirection:
																			"column",
																		gap: "0.4rem",
																		flex: 1,
																		overflowY:
																			"auto",
																		maxHeight:
																			"350px",
																	}}>
																	{(
																		kanbanData[
																			col
																				.key
																		] || []
																	).length ===
																	0 ? (
																		<div
																			style={{
																				textAlign:
																					"center",
																				padding:
																					"1.5rem 0.5rem",
																				color: "var(--text-muted)",
																				fontSize:
																					"0.75rem",
																				fontStyle:
																					"italic",
																			}}>
																			Aucune
																			tache
																		</div>
																	) : (
																		(
																			kanbanData[
																				col
																					.key
																			] ||
																			[]
																		).map(
																			(
																				t,
																			) => (
																				<div
																					key={
																						t.id
																					}
																					style={{
																						background:
																							"var(--card-bg)",
																						borderRadius:
																							"8px",
																						padding:
																							"0.6rem",
																						border: "1px solid var(--border-color)",
																					}}>
																					<div
																						style={{
																							fontWeight: 600,
																							fontSize:
																								"0.78rem",
																							marginBottom:
																								"0.35rem",
																							lineHeight: 1.3,
																						}}>
																						{
																							t.title
																						}
																					</div>
																					<div
																						style={{
																							display:
																								"flex",
																							alignItems:
																								"center",
																							justifyContent:
																								"space-between",
																						}}>
																						<span
																							className={`badge ${PriorityBadges[t.priority] || "badge-light"}`}
																							style={{
																								fontSize:
																									"0.6rem",
																							}}>
																							{PriorityLabels[
																								t
																									.priority
																							] ||
																								""}
																						</span>
																						<div
																							style={{
																								display:
																									"flex",
																								alignItems:
																									"center",
																								gap: "0.3rem",
																							}}>
																							{t.dueDate && (
																								<span
																									style={{
																										fontSize:
																											"0.65rem",
																										color: isOverdue(
																											t,
																										)
																											? "var(--danger)"
																											: "var(--text-muted)",
																									}}>
																									{formatDateShort(
																										t.dueDate,
																									)}
																								</span>
																							)}
																							{t.assignee && (
																								<MemberAvatar
																									member={
																										t.assignee
																									}
																									size={
																										18
																									}
																								/>
																							)}
																						</div>
																					</div>
																				</div>
																			),
																		)
																	)}
																</div>
															</div>
														),
													)}
												</div>
											)}
										</div>
									)}

									{/* ════════════════════════════════════
									    CALENDRIER TAB
									    ════════════════════════════════════ */}
									{detailTab === "calendar" && (
										<div>
											{timelineItems.length === 0 ? (
												<div
													style={{
														display: "flex",
														flexDirection: "column",
														alignItems: "center",
														justifyContent:
															"center",
														textAlign: "center",
														padding: "3rem",
														color: "var(--text-muted)",
													}}>
													<div
														style={{
															marginBottom:
																"0.75rem",
															opacity: 0.5,
														}}>
														<IconCalendar
															size={32}
														/>
													</div>
													<h4
														style={{
															margin: "0 0 0.3rem",
															fontWeight: 600,
														}}>
														Aucun evenement
													</h4>
													<p
														style={{
															margin: 0,
															fontSize: "0.82rem",
														}}>
														Aucun evenement ou
														echeance pour ce projet
													</p>
												</div>
											) : (
												<div
													style={{
														position: "relative",
														paddingLeft: "2rem",
													}}>
													{/* Vertical timeline line */}
													<div
														style={{
															position:
																"absolute",
															left: "7px",
															top: "4px",
															bottom: "4px",
															width: "2px",
															background:
																"var(--border-color)",
														}}
													/>
													{timelineItems.map(
														(item, idx) => {
															const isPast =
																item.date <
																new Date();
															const isToday =
																item.date.toDateString() ===
																new Date().toDateString();
															return (
																<div
																	key={
																		item.id
																	}
																	style={{
																		position:
																			"relative",
																		marginBottom:
																			idx <
																			timelineItems.length -
																				1
																				? "1.25rem"
																				: 0,
																		opacity:
																			isPast &&
																			!isToday
																				? 0.5
																				: 1,
																	}}>
																	{/* Timeline dot */}
																	<div
																		style={{
																			position:
																				"absolute",
																			left: "-2rem",
																			top: "0.2rem",
																			width: "14px",
																			height: "14px",
																			borderRadius:
																				"50%",
																			background:
																				item.color,
																			border: "2px solid var(--card-bg)",
																			zIndex: 1,
																		}}
																	/>
																	{/* Timeline card */}
																	<div
																		style={{
																			background:
																				"var(--bg-alt)",
																			borderRadius:
																				"10px",
																			padding:
																				"0.75rem 1rem",
																			borderLeft: `3px solid ${item.color}`,
																		}}>
																		<div
																			style={{
																				display:
																					"flex",
																				alignItems:
																					"center",
																				justifyContent:
																					"space-between",
																				marginBottom:
																					"0.3rem",
																			}}>
																			<span
																				style={{
																					fontWeight: 600,
																					fontSize:
																						"0.85rem",
																				}}>
																				{
																					item.title
																				}
																			</span>
																			<span
																				className={`badge ${item.type === "event" ? "badge-primary" : "badge-warning"}`}
																				style={{
																					fontSize:
																						"0.62rem",
																				}}>
																				{item.type ===
																				"event"
																					? item.detail
																					: "Echeance"}
																			</span>
																		</div>
																		<div
																			style={{
																				display:
																					"flex",
																				alignItems:
																					"center",
																				gap: "0.5rem",
																				fontSize:
																					"0.75rem",
																				color: "var(--text-muted)",
																			}}>
																			<IconCalendar
																				size={
																					11
																				}
																			/>
																			{formatDateLong(
																				item.date,
																			)}
																			{isToday && (
																				<span
																					className="badge badge-primary"
																					style={{
																						fontSize:
																							"0.6rem",
																					}}>
																					Aujourd&apos;hui
																				</span>
																			)}
																			{item.type ===
																				"deadline" && (
																				<span
																					style={{
																						color: item.color,
																						fontWeight: 600,
																					}}>
																					{
																						item.detail
																					}
																				</span>
																			)}
																		</div>
																	</div>
																</div>
															);
														},
													)}
												</div>
											)}
										</div>
									)}

									{/* ════════════════════════════════════
									    MEMBRES TAB
									    ════════════════════════════════════ */}
									{detailTab === "members" && (
										<div>
											{(selectedProject.membersData
												?.length ?? 0) === 0 ? (
												<div
													style={{
														display: "flex",
														flexDirection: "column",
														alignItems: "center",
														justifyContent:
															"center",
														textAlign: "center",
														padding: "3rem",
														color: "var(--text-muted)",
													}}>
													<div
														style={{
															marginBottom:
																"0.75rem",
															opacity: 0.5,
														}}>
														<IconUsers size={32} />
													</div>
													<h4
														style={{
															margin: "0 0 0.3rem",
															fontWeight: 600,
														}}>
														Aucun membre
													</h4>
													<p
														style={{
															margin: 0,
															fontSize: "0.82rem",
														}}>
														Ajoutez des membres en
														modifiant le projet
													</p>
												</div>
											) : (
												<div
													style={{
														display: "grid",
														gridTemplateColumns:
															"repeat(auto-fill, minmax(250px, 1fr))",
														gap: "0.75rem",
													}}>
													{(
														selectedProject.membersData ??
														[]
													).map((m) => {
														const tc =
															memberTaskCounts[
																m.id
															] || {
																total: 0,
																completed: 0,
															};
														const memberProgress =
															tc.total > 0
																? Math.round(
																		(tc.completed /
																			tc.total) *
																			100,
																	)
																: 0;
														return (
															<div
																key={m.id}
																style={{
																	background:
																		"var(--bg-alt)",
																	borderRadius:
																		"12px",
																	padding:
																		"1rem",
																	display:
																		"flex",
																	flexDirection:
																		"column",
																	gap: "0.65rem",
																}}>
																<div
																	style={{
																		display:
																			"flex",
																		alignItems:
																			"center",
																		gap: "0.75rem",
																	}}>
																	<MemberAvatar
																		member={
																			m
																		}
																		size={
																			40
																		}
																		color={
																			PROJECT_COLORS[
																				m.id %
																					PROJECT_COLORS.length
																			]
																		}
																	/>
																	<div
																		style={{
																			flex: 1,
																			minWidth: 0,
																		}}>
																		<div
																			style={{
																				fontWeight: 700,
																				fontSize:
																					"0.9rem",
																			}}>
																			{
																				m.name
																			}
																		</div>
																		{m.username && (
																			<div
																				style={{
																					fontSize:
																						"0.75rem",
																					color: "var(--text-muted)",
																				}}>
																				@
																				{
																					m.username
																				}
																			</div>
																		)}
																	</div>
																</div>
																{/* Member task stats */}
																<div>
																	<div
																		style={{
																			display:
																				"flex",
																			justifyContent:
																				"space-between",
																			fontSize:
																				"0.72rem",
																			color: "var(--text-muted)",
																			marginBottom:
																				"0.3rem",
																		}}>
																		<span>
																			Taches
																		</span>
																		<span>
																			{
																				tc.completed
																			}
																			/
																			{
																				tc.total
																			}{" "}
																			(
																			{
																				memberProgress
																			}
																			%)
																		</span>
																	</div>
																	<ProgressBar
																		value={
																			memberProgress
																		}
																		height={
																			5
																		}
																	/>
																</div>
															</div>
														);
													})}
												</div>
											)}
										</div>
									)}

									{/* ════════════════════════════════════
									    FICHIERS TAB
									    ════════════════════════════════════ */}
									{detailTab === "files" && (
										<div
											style={{
												display: "flex",
												flexDirection: "column",
												alignItems: "center",
												justifyContent: "center",
												textAlign: "center",
												padding: "3rem",
												color: "var(--text-muted)",
											}}>
											<div
												style={{
													marginBottom: "0.75rem",
													opacity: 0.5,
												}}>
												<IconFile size={32} />
											</div>
											<h4
												style={{
													margin: "0 0 0.3rem",
													fontWeight: 600,
													color: "var(--text)",
												}}>
												Fichiers
											</h4>
											<p
												style={{
													margin: "0 0 1rem",
													fontSize: "0.82rem",
												}}>
												La gestion de fichiers sera
												disponible prochainement
											</p>
											<div
												style={{
													display: "inline-flex",
													alignItems: "center",
													gap: "0.5rem",
													padding: "0.75rem 1.25rem",
													background: "var(--bg-alt)",
													borderRadius: "10px",
													border: "1.5px dashed var(--border-color)",
													color: "var(--text-muted)",
													fontSize: "0.82rem",
												}}>
												<IconFile size={16} />
												Deposer des fichiers ici
											</div>
										</div>
									)}
								</>
							)}
						</div>
					</div>
				</div>
			)}

			{/* ================================================================
			   Create / Edit Modal
			   ================================================================ */}
			{showModal && (
				<div
					className="modal-overlay"
					onClick={() => setShowModal(false)}>
					<div
						className="modal-content"
						style={{ maxWidth: "600px" }}
						onClick={(e) => e.stopPropagation()}>
						<div className="modal-header">
							<h3>
								{editMode
									? "Modifier le projet"
									: "Nouveau projet"}
							</h3>
							<button
								className="btn-icon"
								onClick={() => setShowModal(false)}>
								<IconClose />
							</button>
						</div>
						<div
							className="modal-body"
							style={{ maxHeight: "65vh", overflowY: "auto" }}>
							{/* Emoji + Name row */}
							<div
								style={{
									display: "grid",
									gridTemplateColumns: "56px 1fr",
									gap: "1rem",
									alignItems: "end",
									marginBottom: "1rem",
								}}>
								<div
									className="form-group"
									style={{ margin: 0 }}>
									<label>Emoji</label>
									<input
										value={form.emoji}
										onChange={(e) =>
											setForm({
												...form,
												emoji: e.target.value,
											})
										}
										placeholder="\uD83D\uDCC1"
										maxLength={2}
										style={{
											textAlign: "center",
											fontSize: "1.2rem",
										}}
									/>
								</div>
								<div
									className="form-group"
									style={{ margin: 0 }}>
									<label>Nom du projet *</label>
									<input
										value={form.name}
										onChange={(e) =>
											setForm({
												...form,
												name: e.target.value,
											})
										}
										placeholder="Nom du projet"
									/>
								</div>
							</div>

							{/* Description */}
							<div className="form-group">
								<label>Description</label>
								<textarea
									value={form.description}
									onChange={(e) =>
										setForm({
											...form,
											description: e.target.value,
										})
									}
									rows={3}
									placeholder="Description optionnelle..."
									style={{ resize: "vertical" }}
								/>
							</div>

							{/* Status + Priority row */}
							<div
								style={{
									display: "grid",
									gridTemplateColumns: "1fr 1fr",
									gap: "1rem",
									marginBottom: "0",
								}}>
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
										{STATUS_OPTIONS.map((s) => (
											<option
												key={s.value}
												value={s.value}>
												{s.label}
											</option>
										))}
									</select>
								</div>
								<div className="form-group">
									<label>Priorite</label>
									<select
										value={form.priority}
										onChange={(e) =>
											setForm({
												...form,
												priority: e.target.value,
											})
										}>
										<option value="low">Faible</option>
										<option value="medium">Moyen</option>
										<option value="high">Eleve</option>
									</select>
								</div>
							</div>

							{/* Color picker */}
							<div className="form-group">
								<label>Couleur</label>
								<div
									style={{
										display: "flex",
										gap: "0.4rem",
										flexWrap: "wrap",
									}}>
									{PROJECT_COLORS.map((c) => (
										<button
											key={c}
											onClick={() =>
												setForm({ ...form, color: c })
											}
											style={{
												width: "28px",
												height: "28px",
												borderRadius: "8px",
												background: c,
												border:
													form.color === c
														? "2.5px solid var(--text)"
														: "2px solid transparent",
												cursor: "pointer",
												transition: "transform 0.1s",
												transform:
													form.color === c
														? "scale(1.15)"
														: "scale(1)",
											}}
										/>
									))}
								</div>
							</div>

							{/* Date range */}
							<div
								style={{
									display: "grid",
									gridTemplateColumns: "1fr 1fr",
									gap: "1rem",
								}}>
								<div className="form-group">
									<label>Date de debut</label>
									<input
										type="date"
										value={form.startDate}
										onChange={(e) =>
											setForm({
												...form,
												startDate: e.target.value,
											})
										}
									/>
								</div>
								<div className="form-group">
									<label>Date de fin</label>
									<input
										type="date"
										value={form.endDate}
										onChange={(e) =>
											setForm({
												...form,
												endDate: e.target.value,
											})
										}
									/>
								</div>
							</div>

							{/* Budget */}
							<div className="form-group">
								<label>Budget</label>
								<input
									type="number"
									value={form.budget}
									onChange={(e) =>
										setForm({
											...form,
											budget: e.target.value,
										})
									}
									placeholder="Budget en euros"
									min={0}
									step={100}
								/>
							</div>

							{/* Members */}
							<div className="form-group">
								<label>
									Membres ({form.members.length} selectionne
									{form.members.length !== 1 ? "s" : ""})
								</label>
								<div
									style={{
										display: "flex",
										flexDirection: "column",
										gap: "0.35rem",
										maxHeight: "200px",
										overflowY: "auto",
										padding: "0.5rem",
										border: "1.5px solid var(--border-color)",
										borderRadius: "8px",
									}}>
									{users.length === 0 ? (
										<div
											style={{
												padding: "0.5rem",
												color: "var(--text-muted)",
												fontSize: "0.82rem",
												fontStyle: "italic",
											}}>
											Aucun utilisateur disponible
										</div>
									) : (
										users.map((u) => (
											<label
												key={u.id}
												style={{
													display: "flex",
													alignItems: "center",
													gap: "0.6rem",
													cursor: "pointer",
													padding: "0.3rem 0.25rem",
													borderRadius: "6px",
													background:
														form.members.includes(
															u.id,
														)
															? "rgba(46, 74, 138, 0.06)"
															: "transparent",
													transition:
														"background 0.1s",
												}}>
												<input
													type="checkbox"
													checked={form.members.includes(
														u.id,
													)}
													onChange={() =>
														toggleMember(u.id)
													}
													style={{
														width: "auto",
														margin: 0,
													}}
												/>
												<MemberAvatar
													member={u}
													size={24}
												/>
												<span
													style={{
														fontSize: "0.875rem",
														fontWeight: 500,
													}}>
													{u.name}
												</span>
												<span
													style={{
														fontSize: "0.72rem",
														color: "var(--text-muted)",
													}}>
													@{u.username}
												</span>
												{form.members.includes(
													u.id,
												) && (
													<span
														style={{
															marginLeft: "auto",
															color: "var(--success)",
															display: "flex",
														}}>
														<IconCheck size={14} />
													</span>
												)}
											</label>
										))
									)}
								</div>
							</div>
						</div>
						<div className="modal-footer">
							<button
								className="btn-secondary btn-sm"
								onClick={() => setShowModal(false)}>
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
