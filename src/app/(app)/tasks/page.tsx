"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import api from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { useConfirm } from "@/hooks/useConfirm";
import {
	TaskStatusLabels,
	TaskStatusBadges,
	TaskStatusColors,
	PriorityLabels,
	PriorityBadges,
	TaskStatuses,
	Priorities,
	KanbanColumns,
} from "@/types/constants";
import type { Task, Project, User } from "@/types";

// Priority color map (for chart segments and priority badges)
const PRIORITY_COLOR: Record<string, string> = {
	high: "var(--danger)",
	medium: "var(--warning)",
	low: "var(--text-muted)",
};

// Ordered list of priority group definitions
const PRIORITY_GROUPS = [
	{
		key: "urgent",
		label: "Urgent",
		color: "var(--danger)",
		bgColor: "var(--danger-light)",
	},
	{
		key: "high",
		label: "Eleve",
		color: "var(--warning)",
		bgColor: "var(--warning-light)",
	},
	{
		key: "medium",
		label: "Moyen",
		color: "var(--primary)",
		bgColor: "rgba(46,74,138,0.1)",
	},
	{
		key: "normal",
		label: "Normal",
		color: "var(--text-muted)",
		bgColor: "var(--bg-alt)",
	},
];

// Kanban column definitions (uses shared KanbanColumns from constants)
const KANBAN_COLS: { status: Task["status"]; label: string; color: string }[] =
	KanbanColumns.filter((c) => c.key !== TaskStatuses.Cancelled).map((c) => ({
		status: c.key as Task["status"],
		label: c.label,
		color: c.color,
	}));

// Blank form for create/edit
const INITIAL_FORM = {
	title: "",
	description: "",
	status: TaskStatuses.Pending as Task["status"],
	priority: Priorities.Medium as Task["priority"],
	assigneeId: "",
	projectId: "",
	dueDate: "",
};

// CSS injected globally for animations and component-level classes
const PAGE_CSS = `
@keyframes task-complete-pop {
	0%   { transform: scale(1); }
	30%  { transform: scale(1.35); }
	60%  { transform: scale(0.9); }
	100% { transform: scale(1); }
}

@keyframes slide-in-down {
	from { transform: translateY(-10px); opacity: 0; }
	to   { transform: translateY(0); opacity: 1; }
}

@keyframes modal-in {
	from { transform: translateY(20px) scale(0.98); opacity: 0; }
	to   { transform: translateY(0) scale(1); opacity: 1; }
}

@keyframes pulse-glow {
	0%, 100% { box-shadow: 0 0 0 0 rgba(192,57,43,0.2); }
	50%       { box-shadow: 0 0 0 6px rgba(192,57,43,0); }
}

@keyframes check-draw {
	from { stroke-dashoffset: 20; }
	to   { stroke-dashoffset: 0; }
}

.task-completing { animation: task-complete-pop 0.4s ease; }

.task-completed-row { opacity: 0.5; transition: opacity 0.4s ease; }
.task-completed-row .task-title-text {
	text-decoration: line-through;
	color: var(--text-muted) !important;
}

.quick-add-expand { animation: slide-in-down 0.2s ease; }
.detail-modal-enter { animation: modal-in 0.25s cubic-bezier(0.4, 0, 0.2, 1); }

.overdue-pulse { animation: pulse-glow 2s infinite; }

.task-checkbox {
	width: 20px; height: 20px; min-width: 20px;
	border-radius: 50%;
	border: 2px solid var(--border-dark);
	cursor: pointer;
	display: flex; align-items: center; justify-content: center;
	transition: all 0.2s ease;
	flex-shrink: 0;
	background: transparent;
	padding: 0;
}
.task-checkbox:hover { border-color: var(--success); background: rgba(39,174,96,0.08); }
.task-checkbox.checked { border-color: var(--success); background: var(--success); }
.task-checkbox.checked svg {
	stroke-dasharray: 20; stroke-dashoffset: 0;
	animation: check-draw 0.25s ease forwards;
}
.task-checkbox.priority-high { border-color: var(--danger); }
.task-checkbox.priority-high:hover { border-color: var(--danger); background: rgba(192,57,43,0.08); }
.task-checkbox.priority-medium { border-color: var(--warning); }
.task-checkbox.priority-medium:hover { border-color: var(--warning); background: rgba(184,146,58,0.08); }

.today-section {
	background: linear-gradient(135deg, rgba(46,74,138,0.05) 0%, rgba(184,146,58,0.05) 100%);
	border: 1.5px solid var(--border-color);
	border-radius: var(--radius-lg, 14px);
	padding: 1rem 1.25rem;
	margin-bottom: 1.25rem;
}

.priority-group-header {
	display: flex; align-items: center; gap: 0.6rem;
	padding: 0.65rem 1rem;
	cursor: pointer; user-select: none;
	border-bottom: 1px solid var(--border-color);
	transition: background 0.15s ease;
}
.priority-group-header:hover { background: var(--hover-bg); }

.task-row {
	display: flex; align-items: center; gap: 0.75rem;
	padding: 0.65rem 1rem;
	border-bottom: 1px solid var(--border-color);
	cursor: pointer;
	transition: background 0.15s ease;
}
.task-row:hover { background: var(--hover-bg); }
.task-row:last-child { border-bottom: none; }
.task-row.overdue { background: rgba(192,57,43,0.03); }
.task-row.overdue:hover { background: rgba(192,57,43,0.07); }
.task-row.drag-over { background: rgba(46,74,138,0.08); outline: 2px dashed var(--primary); }

.kanban-card {
	padding: 0.85rem;
	cursor: pointer;
	transition: all 0.2s ease, border-color 0.2s ease;
}
.kanban-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
.kanban-card.dragging { opacity: 0.4; }

.kanban-col-drop-zone {
	border-radius: 10px;
	transition: background 0.15s ease, outline 0.15s ease;
	min-height: 120px;
}
.kanban-col-drop-zone.drag-over {
	background: rgba(46,74,138,0.05);
	outline: 2px dashed var(--primary);
}

.detail-tab-btn {
	flex: 1;
	padding: 0.65rem 0.5rem;
	border: none; background: transparent;
	font-weight: 500; font-size: 0.78rem;
	cursor: pointer; transition: all 0.15s ease;
	font-family: inherit;
	border-bottom: 2px solid transparent;
	color: var(--text-muted);
}
.detail-tab-btn:hover { color: var(--text); }
.detail-tab-btn.active {
	color: var(--accent); font-weight: 700;
	border-bottom-color: var(--accent);
}

.status-change-badge {
	cursor: pointer; transition: all 0.12s ease;
	border: 1px solid transparent;
}
.status-change-badge:hover { transform: scale(1.05); }

.filter-label {
	font-size: 0.72rem; font-weight: 600;
	color: var(--text-muted);
	text-transform: uppercase; letter-spacing: 0.04em;
}

.kanban-move-btn {
	flex: 1;
	padding: 0.22rem 0;
	border: 1px solid var(--border-color);
	border-radius: 4px;
	background: transparent;
	color: var(--text-muted);
	font-size: 0.65rem; cursor: pointer;
	transition: all 0.12s ease;
	font-family: inherit;
}
.kanban-move-btn:hover {
	background: var(--hover-bg);
	color: var(--text);
	border-color: var(--border-dark);
}
`;

// Shared select / input style for filters
const FILTER_SELECT_STYLE: React.CSSProperties = {
	padding: "0.5rem 0.75rem",
	border: "1.5px solid var(--border-color)",
	borderRadius: "8px",
	background: "var(--card-bg)",
	color: "var(--text)",
	fontSize: "0.82rem",
	fontFamily: "inherit",
};

// Helper functions

/**
 * Format a date as DD/MM/YYYY
 * @param d - Date value
 * @returns Formatted date string
 */

function formatDate(d: string | Date): string {
	return new Date(d).toLocaleDateString("fr-FR", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	});
}

/**
 * Format a date as a short human-readable label (Aujourd'hui / Demain / DD Mon)
 * @param d - Date value
 * @returns Short label string
 */

function formatDateShort(d: string | Date): string {
	const date = new Date(d);
	const now = new Date();
	const tomorrow = new Date(now);
	tomorrow.setDate(tomorrow.getDate() + 1);
	if (isSameDay(date, now)) return "Aujourd\u2019hui";
	if (isSameDay(date, tomorrow)) return "Demain";
	return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

/**
 * Format a date with hours and minutes
 * @param d - Date value
 * @returns Full datetime string
 */

function formatDateTime(d: string | Date): string {
	return new Date(d).toLocaleDateString("fr-FR", {
		day: "2-digit",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

/**
 * Check if two dates fall on the same calendar day
 * @param a - First date
 * @param b - Second date
 * @returns True if same day
 */

function isSameDay(a: Date, b: Date): boolean {
	return (
		a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate()
	);
}

/**
 * Check if a date is today
 * @param d - Date value
 * @returns True if today
 */

function isToday(d: string | Date): boolean {
	return isSameDay(new Date(d), new Date());
}

/**
 * Check if a task is overdue (past due date and not done/cancelled)
 * @param t - Task to check
 * @returns True if overdue
 */

function isOverdue(t: Task): boolean {
	if (!t.dueDate || t.status === "realisee" || t.status === "annulee")
		return false;
	return new Date(t.dueDate) < new Date();
}

/**
 * Check if a task is due today and not done/cancelled
 * @param t - Task to check
 * @returns True if due today
 */

function isDueToday(t: Task): boolean {
	if (!t.dueDate || t.status === "realisee" || t.status === "annulee")
		return false;
	return isToday(t.dueDate);
}

/**
 * Determine which priority group a task belongs to
 * @param t - Task to evaluate
 * @returns Group key: urgent | high | medium | normal
 */

function getPriorityGroup(t: Task): string {
	if (isOverdue(t)) return "urgent";
	if (t.priority === "high") return "high";
	if (t.priority === "medium") return "medium";
	return "normal";
}

/**
 * Map a priority group key to the task priority value for API updates
 * @param groupKey - Group key
 * @returns Task priority or null if not mappable
 */

function groupKeyToPriority(groupKey: string): Task["priority"] | null {
	if (groupKey === "high") return "high";
	if (groupKey === "medium") return "medium";
	if (groupKey === "normal") return "low";
	return null;
}

/**
 * Parse markdown-style subtasks from a description string
 * @param description - Raw description text
 * @returns Array of subtask items with text and done state
 */

function parseSubtasks(
	description: string | null,
): { text: string; done: boolean }[] {
	if (!description) return [];
	const lines = description.split("\n");
	const items: { text: string; done: boolean }[] = [];
	for (const line of lines) {
		const matchChecked = line.match(/^[-*]\s*\[x\]\s*(.+)/i);
		const matchUnchecked = line.match(/^[-*]\s*\[\s*\]\s*(.+)/);
		if (matchChecked)
			items.push({ text: matchChecked[1].trim(), done: true });
		else if (matchUnchecked)
			items.push({ text: matchUnchecked[1].trim(), done: false });
	}
	return items;
}

/**
 * Tasks page — list and kanban views with drag and drop
 * @returns Tasks page component
 */

export default function TasksPage() {
	const { user } = useAuth();
	const { showToast } = useToast();
	const confirm = useConfirm();

	// Core data
	const [tasks, setTasks] = useState<Task[]>([]);
	const [projects, setProjects] = useState<Project[]>([]);
	const [users, setUsers] = useState<User[]>([]);
	const [loading, setLoading] = useState(true);

	// View state
	const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
	const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
		new Set(),
	);

	// Filters
	const [search, setSearch] = useState("");
	const [filterStatus, setFilterStatus] = useState("");
	const [filterPriority, setFilterPriority] = useState("");
	const [filterAssignee, setFilterAssignee] = useState("");

	// Create / edit modal
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [editMode, setEditMode] = useState(false);
	const [editTarget, setEditTarget] = useState<Task | null>(null);
	const [form, setForm] = useState(INITIAL_FORM);
	const [saving, setSaving] = useState(false);

	// Detail modal
	const [selectedTask, setSelectedTask] = useState<Task | null>(null);
	const [detailTab, setDetailTab] = useState<
		"details" | "comments" | "activity"
	>("details");
	const [comment, setComment] = useState("");
	const [postingComment, setPostingComment] = useState(false);

	// Quick-add bar
	const [quickAddOpen, setQuickAddOpen] = useState(false);
	const [quickAddTitle, setQuickAddTitle] = useState("");
	const [quickAddPriority, setQuickAddPriority] =
		useState<Task["priority"]>("medium");
	const [quickAddProject, setQuickAddProject] = useState("");
	const [quickAddDueDate, setQuickAddDueDate] = useState("");
	const [quickAddAssignee, setQuickAddAssignee] = useState("");
	const [quickAddSaving, setQuickAddSaving] = useState(false);
	const quickAddRef = useRef<HTMLInputElement>(null);

	// Task completion animation tracking
	const [completingTasks, setCompletingTasks] = useState<Set<number>>(
		new Set(),
	);
	const [recentlyCompleted, setRecentlyCompleted] = useState<Set<number>>(
		new Set(),
	);

	// Kanban drag state
	const kanbanDragTaskRef = useRef<Task | null>(null);
	const [kanbanDragOverCol, setKanbanDragOverCol] = useState<string | null>(
		null,
	);

	// List view drag state
	const listDragRef = useRef<{ taskId: number; groupKey: string } | null>(
		null,
	);
	const [listDragOverTaskId, setListDragOverTaskId] = useState<number | null>(
		null,
	);

	// Local visual order for list groups (drag reorder without API)
	const [localGroupOrders, setLocalGroupOrders] = useState<
		Record<string, Task[]>
	>({
		urgent: [],
		high: [],
		medium: [],
		normal: [],
	});

	// Data loading

	/**
	 * Fetch tasks from API, applying server-side filters
	 * @returns void
	 */

	const load = useCallback(async () => {
		setLoading(true);
		try {
			const params = new URLSearchParams();
			if (filterStatus) params.set("status", filterStatus);
			if (filterAssignee) params.set("assigneeId", filterAssignee);
			const data = await api.get<Task[]>(`/tasks?${params}`);
			setTasks(data);
		} catch {
			showToast("Erreur de chargement", "error");
		} finally {
			setLoading(false);
		}
	}, [filterStatus, filterAssignee, showToast]);

	/**
	 * Load reference data (projects + users) once
	 * @returns void
	 */

	const loadRefs = useCallback(async () => {
		try {
			const [p, u] = await Promise.all([
				api.get<Project[]>("/projects"),
				api.get<User[]>("/users"),
			]);
			setProjects(p);
			setUsers(u);
		} catch {
			// silent — non-critical
		}
	}, []);

	useEffect(() => {
		loadRefs();
	}, [loadRefs]);
	useEffect(() => {
		load();
	}, [load]);

	// Keep selected task in sync after reload
	useEffect(() => {
		if (selectedTask) {
			const refreshed = tasks.find((t) => t.id === selectedTask.id);
			if (refreshed) setSelectedTask(refreshed);
			else setSelectedTask(null);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [tasks]);

	// Computed values

	const displayed = useMemo(() => {
		return tasks.filter((t) => {
			if (filterPriority && t.priority !== filterPriority) return false;
			if (search) {
				const q = search.toLowerCase();
				return (
					t.title.toLowerCase().includes(q) ||
					(t.description || "").toLowerCase().includes(q)
				);
			}
			return true;
		});
	}, [tasks, filterPriority, search]);

	const todayTasks = useMemo(
		() =>
			tasks.filter(
				(t) =>
					isDueToday(t) &&
					t.status !== "realisee" &&
					t.status !== "annulee",
			),
		[tasks],
	);

	const overdueTasks = useMemo(() => tasks.filter(isOverdue), [tasks]);

	// Priority-grouped tasks sorted by due date
	const priorityGrouped = useMemo(() => {
		const groups: Record<string, Task[]> = {
			urgent: [],
			high: [],
			medium: [],
			normal: [],
		};
		for (const t of displayed) groups[getPriorityGroup(t)].push(t);
		for (const key of Object.keys(groups)) {
			groups[key].sort((a, b) => {
				if (a.dueDate && b.dueDate)
					return (
						new Date(a.dueDate).getTime() -
						new Date(b.dueDate).getTime()
					);
				if (a.dueDate) return -1;
				if (b.dueDate) return 1;
				return 0;
			});
		}
		return groups;
	}, [displayed]);

	// Sync local visual orders when server data changes
	useEffect(() => {
		setLocalGroupOrders({ ...priorityGrouped });
	}, [priorityGrouped]);

	// Handlers

	/**
	 * Open the create task modal with blank form
	 */

	const openCreate = () => {
		setEditMode(false);
		setEditTarget(null);
		setForm({ ...INITIAL_FORM, assigneeId: String(user?.id || "") });
		setShowCreateModal(true);
	};

	/**
	 * Open the edit task modal pre-filled with task data
	 * @param t - Task to edit
	 */

	const openEdit = (t: Task) => {
		setEditMode(true);
		setEditTarget(t);
		setForm({
			title: t.title,
			description: t.description || "",
			status: t.status,
			priority: t.priority,
			assigneeId: t.assigneeId ? String(t.assigneeId) : "",
			projectId: t.projectId ? String(t.projectId) : "",
			dueDate: t.dueDate
				? new Date(t.dueDate).toISOString().slice(0, 10)
				: "",
		});
		setShowCreateModal(true);
	};

	/**
	 * Save the create/edit form to API
	 * @returns void
	 */

	const handleSave = async () => {
		if (!form.title.trim()) {
			showToast("Titre requis", "error");
			return;
		}
		setSaving(true);
		try {
			const payload = {
				title: form.title.trim(),
				description: form.description || null,
				status: form.status,
				priority: form.priority,
				assigneeId: form.assigneeId ? Number(form.assigneeId) : null,
				projectId: form.projectId ? Number(form.projectId) : null,
				dueDate: form.dueDate || null,
			};
			if (editMode && editTarget) {
				await api.put(`/tasks/${editTarget.id}`, payload);
				showToast("Tache modifiee", "success");
			} else {
				await api.post("/tasks", payload);
				showToast("Tache creee", "success");
			}
			setShowCreateModal(false);
			load();
		} catch (e) {
			showToast((e as Error).message, "error");
		} finally {
			setSaving(false);
		}
	};

	/**
	 * Delete a task after confirmation
	 * @param t - Task to delete
	 * @returns void
	 */

	const handleDelete = async (t: Task) => {
		const ok = await confirm({
			title: "Supprimer la tache",
			message: `Supprimer "${t.title}" ?`,
			confirmLabel: "Supprimer",
			danger: true,
		});
		if (!ok) return;
		try {
			await api.delete(`/tasks/${t.id}`);
			showToast("Tache supprimee", "success");
			if (selectedTask?.id === t.id) setSelectedTask(null);
			load();
		} catch (e) {
			showToast((e as Error).message, "error");
		}
	};

	/**
	 * Update a task's status via API
	 * @param t - Task to update
	 * @param status - New status value
	 * @returns void
	 */

	const handleStatusChange = async (t: Task, status: Task["status"]) => {
		try {
			await api.put(`/tasks/${t.id}`, {
				status,
				completed: status === "realisee",
			});
			load();
		} catch {
			// silent
		}
	};

	/**
	 * Toggle a task between complete and pending with optimistic update
	 * @param t - Task to toggle
	 * @param e - Click event (stops propagation)
	 * @returns void
	 */

	const handleToggleComplete = async (t: Task, e: React.MouseEvent) => {
		e.stopPropagation();
		const newStatus: Task["status"] =
			t.status === "realisee" ? "en_attente" : "realisee";
		const completing = newStatus === "realisee";

		if (completing) {
			// Animate then fade
			setCompletingTasks((prev) => new Set(prev).add(t.id));
			setTimeout(() => {
				setCompletingTasks((prev) => {
					const n = new Set(prev);
					n.delete(t.id);
					return n;
				});
				setRecentlyCompleted((prev) => new Set(prev).add(t.id));
				setTimeout(() => {
					setRecentlyCompleted((prev) => {
						const n = new Set(prev);
						n.delete(t.id);
						return n;
					});
				}, 2000);
			}, 400);
		}

		// Optimistic update
		setTasks((prev) =>
			prev.map((task) =>
				task.id === t.id
					? { ...task, status: newStatus, completed: completing }
					: task,
			),
		);

		try {
			await api.put(`/tasks/${t.id}`, {
				status: newStatus,
				completed: completing,
			});
		} catch {
			showToast("Erreur lors de la mise a jour", "error");
			load();
		}
	};

	/**
	 * Post a comment on the currently selected task
	 * @returns void
	 */

	const handlePostComment = async () => {
		if (!comment.trim() || !selectedTask) return;
		setPostingComment(true);
		try {
			await api.post(`/tasks/${selectedTask.id}/comments`, {
				content: comment.trim(),
			});
			setComment("");
			const updated = await api.get<Task[]>("/tasks");
			setTasks(updated);
		} catch {
			showToast("Erreur lors de l\u2019envoi", "error");
		} finally {
			setPostingComment(false);
		}
	};

	/**
	 * Create a task from the quick-add bar
	 * @returns void
	 */

	const handleQuickAdd = async () => {
		if (!quickAddTitle.trim()) return;
		setQuickAddSaving(true);
		try {
			await api.post("/tasks", {
				title: quickAddTitle.trim(),
				priority: quickAddPriority,
				projectId: quickAddProject ? Number(quickAddProject) : null,
				assigneeId: quickAddAssignee
					? Number(quickAddAssignee)
					: user?.id || null,
				dueDate: quickAddDueDate || null,
				status: "en_attente",
			});
			showToast("Tache creee", "success");
			setQuickAddTitle("");
			setQuickAddPriority("medium");
			setQuickAddProject("");
			setQuickAddDueDate("");
			setQuickAddAssignee("");
			setQuickAddOpen(false);
			load();
		} catch (e) {
			showToast((e as Error).message, "error");
		} finally {
			setQuickAddSaving(false);
		}
	};

	/**
	 * Toggle the collapsed state of a priority group
	 * @param key - Group key to toggle
	 */

	const toggleGroupCollapse = (key: string) => {
		setCollapsedGroups((prev) => {
			const next = new Set(prev);
			if (next.has(key)) next.delete(key);
			else next.add(key);
			return next;
		});
	};

	/**
	 * Clear all active filters
	 */

	const clearFilters = () => {
		setSearch("");
		setFilterStatus("");
		setFilterPriority("");
		setFilterAssignee("");
	};

	// Kanban drag handlers

	/**
	 * Begin dragging a kanban card
	 * @param t - Task being dragged
	 */

	const handleKanbanDragStart = (t: Task) => {
		kanbanDragTaskRef.current = t;
	};

	/**
	 * Allow drop on a kanban column
	 * @param e - Drag event
	 * @param colStatus - Column status key
	 */

	const handleKanbanDragOver = (e: React.DragEvent, colStatus: string) => {
		e.preventDefault();
		setKanbanDragOverCol(colStatus);
	};

	/**
	 * Drop a card into a kanban column and update status via API
	 * @param colStatus - Target column status
	 * @returns void
	 */

	const handleKanbanDrop = async (colStatus: string) => {
		const t = kanbanDragTaskRef.current;
		kanbanDragTaskRef.current = null;
		setKanbanDragOverCol(null);
		if (!t || t.status === colStatus) return;

		// Optimistic move
		setTasks((prev) =>
			prev.map((task) =>
				task.id === t.id
					? { ...task, status: colStatus as Task["status"] }
					: task,
			),
		);
		try {
			await api.put(`/tasks/${t.id}`, { status: colStatus });
		} catch {
			showToast("Erreur lors du deplacement", "error");
			load();
		}
	};

	/**
	 * Clear kanban drop highlight on drag leave
	 */

	const handleKanbanDragLeave = () => {
		setKanbanDragOverCol(null);
	};

	// List drag handlers

	/**
	 * Begin dragging a list row
	 * @param taskId - ID of the dragged task
	 * @param groupKey - Priority group of the dragged task
	 */

	const handleListDragStart = (taskId: number, groupKey: string) => {
		listDragRef.current = { taskId, groupKey };
	};

	/**
	 * Allow drop on a list row
	 * @param e - Drag event
	 * @param overTaskId - ID of the task being hovered
	 */

	const handleListDragOver = (e: React.DragEvent, overTaskId: number) => {
		e.preventDefault();
		setListDragOverTaskId(overTaskId);
	};

	/**
	 * Drop a task onto a list row — reorder within group or change priority cross-group
	 * @param e - Drag event
	 * @param targetTaskId - ID of the task dropped onto
	 * @param targetGroupKey - Group key of the drop target
	 * @returns void
	 */

	const handleListDrop = async (
		e: React.DragEvent,
		targetTaskId: number,
		targetGroupKey: string,
	) => {
		e.preventDefault();
		const source = listDragRef.current;
		listDragRef.current = null;
		setListDragOverTaskId(null);
		if (!source || source.taskId === targetTaskId) return;

		if (source.groupKey === targetGroupKey) {
			// Same group — visual reorder only
			setLocalGroupOrders((prev) => {
				const groupTasks = [...(prev[source.groupKey] || [])];
				const srcIdx = groupTasks.findIndex(
					(t) => t.id === source.taskId,
				);
				const tgtIdx = groupTasks.findIndex(
					(t) => t.id === targetTaskId,
				);
				if (srcIdx === -1 || tgtIdx === -1) return prev;
				const [moved] = groupTasks.splice(srcIdx, 1);
				groupTasks.splice(tgtIdx, 0, moved);
				return { ...prev, [source.groupKey]: groupTasks };
			});
		} else {
			// Cross-group — update priority via API
			const newPriority = groupKeyToPriority(targetGroupKey);
			if (!newPriority) return;

			// Optimistic priority update in tasks list
			setTasks((prev) =>
				prev.map((t) =>
					t.id === source.taskId
						? { ...t, priority: newPriority }
						: t,
				),
			);

			try {
				await api.put(`/tasks/${source.taskId}`, {
					priority: newPriority,
				});
			} catch {
				showToast("Erreur lors du changement de priorite", "error");
				load();
			}
		}
	};

	/**
	 * End list drag and clear state
	 */

	const handleListDragEnd = () => {
		listDragRef.current = null;
		setListDragOverTaskId(null);
	};

	// Render helpers

	/**
	 * Render a round checkbox button for a task
	 * @param t - Task
	 * @returns Checkbox button element
	 */

	const renderCheckbox = (t: Task) => {
		const done = t.status === "realisee";
		const animating = completingTasks.has(t.id);
		return (
			<button
				className={[
					"task-checkbox",
					done ? "checked" : "",
					!done ? `priority-${t.priority}` : "",
					animating ? "task-completing" : "",
				]
					.filter(Boolean)
					.join(" ")}
				onClick={(e) => handleToggleComplete(t, e)}
				title={done ? "Rouvrir" : "Terminer"}
				aria-label={done ? "Rouvrir" : "Terminer"}>
				{done && (
					<svg
						width="11"
						height="11"
						viewBox="0 0 24 24"
						fill="none"
						stroke="#fff"
						strokeWidth="3.5"
						strokeLinecap="round"
						strokeLinejoin="round">
						<polyline points="20 6 9 17 4 12" />
					</svg>
				)}
			</button>
		);
	};

	/**
	 * Render priority, project and overdue badges for a task
	 * @param t - Task
	 * @param small - Use smaller font size
	 * @returns Badge group element
	 */

	const renderBadges = (t: Task, small = false) => {
		const sz = small ? "0.62rem" : "0.68rem";
		const pd = small ? "0.12rem 0.4rem" : "0.15rem 0.5rem";
		return (
			<div
				style={{
					display: "flex",
					gap: "0.25rem",
					flexWrap: "wrap",
					alignItems: "center",
				}}>
				<span
					className={`badge ${PriorityBadges[t.priority]}`}
					style={{ fontSize: sz, padding: pd }}>
					{PriorityLabels[t.priority]}
				</span>
				{t.project && (
					<span
						className="badge badge-info"
						style={{ fontSize: sz, padding: pd }}>
						{t.project.emoji || ""} {t.project.name}
					</span>
				)}
				{isOverdue(t) && (
					<span
						className="badge badge-danger"
						style={{ fontSize: sz, padding: pd }}>
						En retard
					</span>
				)}
			</div>
		);
	};

	/**
	 * Render a circular avatar with initial fallback
	 * @param name - Display name
	 * @param avatar - Avatar string or null
	 * @param size - Pixel size
	 * @returns Avatar div element
	 */

	const renderAvatar = (name: string, avatar: string | null, size = 24) => (
		<div
			style={{
				width: `${size}px`,
				height: `${size}px`,
				background: "#2e4a8a",
				borderRadius: "50%",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				fontSize: `${size * 0.38}rem`,
				color: "#fff",
				flexShrink: 0,
				fontWeight: 600,
			}}
			title={name}>
			{avatar || name.charAt(0).toUpperCase()}
		</div>
	);

	// Active filter count for badge display
	const activeFilterCount = useMemo(() => {
		let c = 0;
		if (filterStatus) c++;
		if (filterPriority) c++;
		if (filterAssignee) c++;
		return c;
	}, [filterStatus, filterPriority, filterAssignee]);

	// Render

	return (
		<>
			<style>{PAGE_CSS}</style>

			{/* Page layout */}
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					height: "calc(100vh - 4rem)",
					overflow: "hidden",
				}}>
				{/* Main scrollable area */}
				<div
					style={{
						flex: 1,
						overflowY: "auto",
						paddingRight: "0.25rem",
					}}>
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
									<polyline points="9 11 12 14 22 4" />
									<path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
								</svg>
							</div>
							<div className="phb-text">
								<h1>Taches</h1>
								<p className="page-description">
									Gestion des taches et suivi
								</p>
							</div>
						</div>
						<div className="page-header-box-actions">
							<button
								className="btn-primary btn-sm"
								onClick={openCreate}>
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
								Nouvelle tache
							</button>
						</div>
					</div>

					{/* Filter row with view toggle */}
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: "0.6rem",
							marginBottom: "1.25rem",
							flexWrap: "wrap",
						}}>
						{/* Search input */}
						<div
							style={{
								position: "relative",
								flex: 1,
								maxWidth: "260px",
							}}>
							<svg
								width="14"
								height="14"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								style={{
									position: "absolute",
									left: "0.75rem",
									top: "50%",
									transform: "translateY(-50%)",
									color: "var(--text-muted)",
								}}>
								<circle cx="11" cy="11" r="8" />
								<line x1="21" y1="21" x2="16.65" y2="16.65" />
							</svg>
							<input
								className="search-input"
								type="search"
								placeholder="Rechercher..."
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								style={{ paddingLeft: "2.25rem" }}
							/>
						</div>

						{/* Status filter */}
						<select
							value={filterStatus}
							onChange={(e) => setFilterStatus(e.target.value)}
							style={{
								...FILTER_SELECT_STYLE,
								minWidth: "130px",
							}}>
							<option value="">Tous les statuts</option>
							{Object.entries(TaskStatusLabels).map(([v, l]) => (
								<option key={v} value={v}>
									{l}
								</option>
							))}
						</select>

						{/* Priority filter */}
						<select
							value={filterPriority}
							onChange={(e) => setFilterPriority(e.target.value)}
							style={{
								...FILTER_SELECT_STYLE,
								minWidth: "130px",
							}}>
							<option value="">Toutes priorites</option>
							{Object.entries(PriorityLabels).map(([v, l]) => (
								<option key={v} value={v}>
									{l}
								</option>
							))}
						</select>

						{/* Assignee filter */}
						<select
							value={filterAssignee}
							onChange={(e) => setFilterAssignee(e.target.value)}
							style={{
								...FILTER_SELECT_STYLE,
								minWidth: "140px",
							}}>
							<option value="">Tous les membres</option>
							{users.map((u) => (
								<option key={u.id} value={String(u.id)}>
									{u.name}
								</option>
							))}
						</select>

						{/* Clear filters button */}
						{activeFilterCount > 0 && (
							<button
								className="btn-secondary btn-sm"
								onClick={clearFilters}
								style={{ fontSize: "0.78rem" }}>
								Effacer ({activeFilterCount})
							</button>
						)}

						{/* Spacer */}
						<div style={{ flex: 1 }} />

						{/* View toggle */}
						<div
							style={{
								display: "flex",
								gap: "0.25rem",
								background: "var(--bg-alt)",
								borderRadius: "8px",
								padding: "0.25rem",
							}}>
							{(["list", "kanban"] as const).map((v) => (
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
										transition: "all 0.15s ease",
										boxShadow:
											viewMode === v
												? "var(--shadow-sm)"
												: "none",
										display: "flex",
										alignItems: "center",
										gap: "0.35rem",
										fontFamily: "inherit",
									}}>
									{v === "list" ? (
										<>
											<svg
												width="13"
												height="13"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												strokeWidth="2">
												<line
													x1="8"
													y1="6"
													x2="21"
													y2="6"
												/>
												<line
													x1="8"
													y1="12"
													x2="21"
													y2="12"
												/>
												<line
													x1="8"
													y1="18"
													x2="21"
													y2="18"
												/>
												<line
													x1="3"
													y1="6"
													x2="3.01"
													y2="6"
												/>
												<line
													x1="3"
													y1="12"
													x2="3.01"
													y2="12"
												/>
												<line
													x1="3"
													y1="18"
													x2="3.01"
													y2="18"
												/>
											</svg>
											Liste
										</>
									) : (
										<>
											<svg
												width="13"
												height="13"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												strokeWidth="2">
												<rect
													x="3"
													y="3"
													width="7"
													height="7"
												/>
												<rect
													x="14"
													y="3"
													width="7"
													height="7"
												/>
												<rect
													x="3"
													y="14"
													width="7"
													height="7"
												/>
												<rect
													x="14"
													y="14"
													width="7"
													height="7"
												/>
											</svg>
											Kanban
										</>
									)}
								</button>
							))}
						</div>
					</div>

					{/* Today section — shown in list view only when tasks are due today */}
					{viewMode === "list" && todayTasks.length > 0 && (
						<div className="today-section">
							{/* Section header */}
							<div
								style={{
									display: "flex",
									alignItems: "center",
									gap: "0.6rem",
									marginBottom: "0.75rem",
								}}>
								<svg
									width="18"
									height="18"
									viewBox="0 0 24 24"
									fill="none"
									stroke="var(--accent)"
									strokeWidth="2">
									<circle cx="12" cy="12" r="10" />
									<polyline points="12 6 12 12 16 14" />
								</svg>
								<span
									style={{
										fontWeight: 700,
										fontSize: "0.95rem",
										color: "var(--text)",
									}}>
									Aujourd&apos;hui
								</span>
								<span
									style={{
										background: "var(--accent)",
										color: "#fff",
										borderRadius: "999px",
										padding: "0.1rem 0.55rem",
										fontSize: "0.72rem",
										fontWeight: 700,
									}}>
									{todayTasks.length}
								</span>
								{overdueTasks.length > 0 && (
									<span
										className="overdue-pulse"
										style={{
											background: "var(--danger)",
											color: "#fff",
											borderRadius: "999px",
											padding: "0.1rem 0.55rem",
											fontSize: "0.72rem",
											fontWeight: 700,
										}}>
										{overdueTasks.length} en retard
									</span>
								)}
							</div>

							{/* Today task rows */}
							<div
								style={{
									display: "flex",
									flexDirection: "column",
									gap: "0.35rem",
								}}>
								{todayTasks.slice(0, 5).map((t) => (
									<div
										key={t.id}
										style={{
											display: "flex",
											alignItems: "center",
											gap: "0.6rem",
											padding: "0.5rem 0.7rem",
											background: "var(--card-bg)",
											borderRadius: "8px",
											border: "1px solid var(--border-color)",
											cursor: "pointer",
											transition: "all 0.15s ease",
										}}
										onClick={() => {
											setSelectedTask(t);
											setDetailTab("details");
										}}>
										{renderCheckbox(t)}
										<span
											style={{
												flex: 1,
												fontWeight: 600,
												fontSize: "0.85rem",
												color: "var(--text)",
												overflow: "hidden",
												textOverflow: "ellipsis",
												whiteSpace: "nowrap",
											}}>
											{t.title}
										</span>
										{renderBadges(t, true)}
										{t.assignee &&
											renderAvatar(
												t.assignee.name,
												t.assignee.avatar ?? null,
												22,
											)}
									</div>
								))}
								{todayTasks.length > 5 && (
									<div
										style={{
											textAlign: "center",
											fontSize: "0.78rem",
											color: "var(--text-muted)",
											padding: "0.3rem",
										}}>
										+{todayTasks.length - 5} autres taches
									</div>
								)}
							</div>
						</div>
					)}

					{/* LIST VIEW */}
					{viewMode === "list" && (
						<div
							className="card"
							style={{ padding: 0, overflow: "hidden" }}>
							{loading ? (
								<div className="empty-state">
									<p>Chargement...</p>
								</div>
							) : displayed.length === 0 ? (
								<div className="empty-state">
									<svg
										width="48"
										height="48"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="1.5">
										<polyline points="9 11 12 14 22 4" />
										<path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
									</svg>
									<h4>Aucune tache trouvee</h4>
									<p>
										Modifiez vos filtres ou creez une
										nouvelle tache
									</p>
								</div>
							) : (
								PRIORITY_GROUPS.map((group) => {
									const groupTasks =
										localGroupOrders[group.key] || [];
									if (groupTasks.length === 0) return null;
									const isCollapsed = collapsedGroups.has(
										group.key,
									);

									return (
										<div key={group.key}>
											{/* Group header with colored left border */}
											<div
												className="priority-group-header"
												style={{
													borderLeft: `3px solid ${group.color}`,
												}}
												onClick={() =>
													toggleGroupCollapse(
														group.key,
													)
												}>
												{/* Chevron */}
												<svg
													width="12"
													height="12"
													viewBox="0 0 24 24"
													fill="none"
													stroke="var(--text-muted)"
													strokeWidth="2"
													style={{
														transition:
															"transform 0.2s ease",
														transform: isCollapsed
															? "rotate(-90deg)"
															: "rotate(0deg)",
													}}>
													<polyline points="6 9 12 15 18 9" />
												</svg>
												{/* Color dot */}
												<span
													style={{
														width: "8px",
														height: "8px",
														borderRadius: "50%",
														background: group.color,
														flexShrink: 0,
													}}
												/>
												<span
													style={{
														fontWeight: 700,
														fontSize: "0.82rem",
														color: "var(--text)",
														letterSpacing: "0.02em",
													}}>
													{group.label}
												</span>
												{/* Count badge */}
												<span
													style={{
														background:
															group.bgColor,
														color: group.color,
														borderRadius: "999px",
														padding:
															"0.1rem 0.55rem",
														fontSize: "0.72rem",
														fontWeight: 700,
													}}>
													{groupTasks.length}
												</span>
											</div>

											{/* Task rows */}
											{!isCollapsed &&
												groupTasks.map((t) => {
													const isDone =
														t.status === "realisee";
													const isRecent =
														recentlyCompleted.has(
															t.id,
														);
													const isDragOver =
														listDragOverTaskId ===
														t.id;

													return (
														<div
															key={t.id}
															className={[
																"task-row",
																isOverdue(t)
																	? "overdue"
																	: "",
																isDone ||
																isRecent
																	? "task-completed-row"
																	: "",
																isDragOver
																	? "drag-over"
																	: "",
															]
																.filter(Boolean)
																.join(" ")}
															draggable
															onDragStart={() =>
																handleListDragStart(
																	t.id,
																	group.key,
																)
															}
															onDragOver={(e) =>
																handleListDragOver(
																	e,
																	t.id,
																)
															}
															onDrop={(e) =>
																handleListDrop(
																	e,
																	t.id,
																	group.key,
																)
															}
															onDragEnd={
																handleListDragEnd
															}
															onClick={() => {
																setSelectedTask(
																	t,
																);
																setDetailTab(
																	"details",
																);
															}}>
															{/* Drag handle indicator */}
															<svg
																width="10"
																height="14"
																viewBox="0 0 10 14"
																fill="var(--border-dark)"
																style={{
																	flexShrink: 0,
																	opacity: 0.5,
																	cursor: "grab",
																}}>
																<circle
																	cx="3"
																	cy="3"
																	r="1.2"
																/>
																<circle
																	cx="7"
																	cy="3"
																	r="1.2"
																/>
																<circle
																	cx="3"
																	cy="7"
																	r="1.2"
																/>
																<circle
																	cx="7"
																	cy="7"
																	r="1.2"
																/>
																<circle
																	cx="3"
																	cy="11"
																	r="1.2"
																/>
																<circle
																	cx="7"
																	cy="11"
																	r="1.2"
																/>
															</svg>

															{renderCheckbox(t)}

															{/* Title and description */}
															<div
																style={{
																	flex: 1,
																	minWidth: 0,
																}}>
																<div
																	className="task-title-text"
																	style={{
																		fontWeight: 600,
																		fontSize:
																			"0.875rem",
																		color: "var(--text)",
																		overflow:
																			"hidden",
																		textOverflow:
																			"ellipsis",
																		whiteSpace:
																			"nowrap",
																		transition:
																			"all 0.3s ease",
																	}}>
																	{t.title}
																</div>
																{t.description && (
																	<div
																		style={{
																			fontSize:
																				"0.72rem",
																			color: "var(--text-muted)",
																			overflow:
																				"hidden",
																			textOverflow:
																				"ellipsis",
																			whiteSpace:
																				"nowrap",
																			maxWidth:
																				"300px",
																			marginTop:
																				"0.1rem",
																		}}>
																		{
																			t.description
																		}
																	</div>
																)}
															</div>

															{renderBadges(
																t,
																true,
															)}

															{t.assignee &&
																renderAvatar(
																	t.assignee
																		.name,
																	t.assignee
																		.avatar ??
																		null,
																	24,
																)}

															{/* Due date */}
															<div
																style={{
																	fontSize:
																		"0.78rem",
																	color: isOverdue(
																		t,
																	)
																		? "var(--danger)"
																		: "var(--text-muted)",
																	whiteSpace:
																		"nowrap",
																	fontWeight:
																		isOverdue(
																			t,
																		)
																			? 600
																			: 400,
																	minWidth:
																		"70px",
																	textAlign:
																		"right",
																}}>
																{t.dueDate
																	? formatDateShort(
																			t.dueDate,
																		)
																	: ""}
															</div>

															{/* Row actions */}
															<div
																style={{
																	display:
																		"flex",
																	gap: "0.25rem",
																}}
																onClick={(e) =>
																	e.stopPropagation()
																}>
																<button
																	className="btn-icon"
																	onClick={() =>
																		openEdit(
																			t,
																		)
																	}
																	title="Modifier"
																	style={{
																		width: "28px",
																		height: "28px",
																	}}>
																	<svg
																		width="12"
																		height="12"
																		viewBox="0 0 24 24"
																		fill="none"
																		stroke="currentColor"
																		strokeWidth="2">
																		<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
																		<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
																	</svg>
																</button>
																<button
																	className="btn-icon delete"
																	onClick={() =>
																		handleDelete(
																			t,
																		)
																	}
																	title="Supprimer"
																	style={{
																		width: "28px",
																		height: "28px",
																	}}>
																	<svg
																		width="12"
																		height="12"
																		viewBox="0 0 24 24"
																		fill="none"
																		stroke="currentColor"
																		strokeWidth="2">
																		<polyline points="3 6 5 6 21 6" />
																		<path d="M19 6l-1 14H6L5 6" />
																	</svg>
																</button>
															</div>
														</div>
													);
												})}
										</div>
									);
								})
							)}

							{/* Quick-add bar at bottom of list */}
							{!loading && (
								<div
									style={{
										borderTop:
											displayed.length > 0
												? "1px solid var(--border-color)"
												: "none",
										padding: quickAddOpen ? "0" : "0.25rem",
									}}>
									{!quickAddOpen ? (
										<button
											className="quick-add-box"
											onClick={() => {
												setQuickAddOpen(true);
												setTimeout(
													() =>
														quickAddRef.current?.focus(),
													50,
												);
											}}>
											<span className="quick-add-box-icon">
												+
											</span>
											Ajouter une tache...
										</button>
									) : (
										<div
											className="quick-add-expand"
											style={{ padding: "1rem 1.25rem" }}>
											{/* Title input row */}
											<div
												style={{
													display: "flex",
													gap: "0.75rem",
													alignItems: "center",
												}}>
												<div
													style={{
														width: "20px",
														height: "20px",
														borderRadius: "50%",
														border: "2px solid var(--accent)",
														flexShrink: 0,
													}}
												/>
												<input
													ref={quickAddRef}
													value={quickAddTitle}
													onChange={(e) =>
														setQuickAddTitle(
															e.target.value,
														)
													}
													placeholder="Nom de la tache..."
													style={{
														flex: 1,
														padding: "0.5rem 0",
														border: "none",
														background:
															"transparent",
														color: "var(--text)",
														fontSize: "0.95rem",
														fontWeight: 600,
														outline: "none",
														fontFamily: "inherit",
													}}
													onKeyDown={(e) => {
														if (
															e.key === "Enter" &&
															!e.shiftKey
														) {
															e.preventDefault();
															handleQuickAdd();
														}
														if (e.key === "Escape")
															setQuickAddOpen(
																false,
															);
													}}
												/>
											</div>

											{/* Extra options row */}
											<div
												style={{
													display: "flex",
													gap: "0.5rem",
													alignItems: "center",
													marginTop: "0.65rem",
													flexWrap: "wrap",
													borderTop:
														"1px solid var(--border-color)",
													paddingTop: "0.65rem",
												}}>
												{/* Priority pills */}
												<div
													style={{
														display: "flex",
														gap: "0.2rem",
														background:
															"var(--bg-alt)",
														borderRadius: "6px",
														padding: "0.15rem",
													}}>
													{(
														[
															"high",
															"medium",
															"low",
														] as const
													).map((p) => (
														<button
															key={p}
															onClick={() =>
																setQuickAddPriority(
																	p,
																)
															}
															style={{
																padding:
																	"0.25rem 0.55rem",
																borderRadius:
																	"4px",
																border: "none",
																background:
																	quickAddPriority ===
																	p
																		? "var(--card-bg)"
																		: "transparent",
																color:
																	quickAddPriority ===
																	p
																		? PRIORITY_COLOR[
																				p
																			]
																		: "var(--text-muted)",
																fontWeight:
																	quickAddPriority ===
																	p
																		? 700
																		: 400,
																fontSize:
																	"0.72rem",
																cursor: "pointer",
																transition:
																	"all 0.12s ease",
																fontFamily:
																	"inherit",
															}}>
															{PriorityLabels[p]}
														</button>
													))}
												</div>

												{/* Project */}
												<select
													value={quickAddProject}
													onChange={(e) =>
														setQuickAddProject(
															e.target.value,
														)
													}
													style={{
														...FILTER_SELECT_STYLE,
														minWidth: "110px",
														fontSize: "0.78rem",
														padding:
															"0.35rem 0.55rem",
													}}>
													<option value="">
														Projet
													</option>
													{projects.map((p) => (
														<option
															key={p.id}
															value={String(
																p.id,
															)}>
															{p.emoji
																? `${p.emoji} `
																: ""}
															{p.name}
														</option>
													))}
												</select>

												{/* Due date */}
												<input
													type="date"
													value={quickAddDueDate}
													onChange={(e) =>
														setQuickAddDueDate(
															e.target.value,
														)
													}
													style={{
														...FILTER_SELECT_STYLE,
														minWidth: "auto",
														fontSize: "0.78rem",
														padding:
															"0.35rem 0.55rem",
													}}
												/>

												{/* Assignee */}
												<select
													value={quickAddAssignee}
													onChange={(e) =>
														setQuickAddAssignee(
															e.target.value,
														)
													}
													style={{
														...FILTER_SELECT_STYLE,
														minWidth: "110px",
														fontSize: "0.78rem",
														padding:
															"0.35rem 0.55rem",
													}}>
													<option value="">
														Moi-meme
													</option>
													{users.map((u) => (
														<option
															key={u.id}
															value={String(
																u.id,
															)}>
															{u.name}
														</option>
													))}
												</select>

												<div
													style={{
														marginLeft: "auto",
														display: "flex",
														gap: "0.4rem",
													}}>
													<button
														className="btn-secondary btn-sm"
														onClick={() => {
															setQuickAddOpen(
																false,
															);
															setQuickAddTitle(
																"",
															);
														}}
														style={{
															fontSize: "0.78rem",
															padding:
																"0.3rem 0.65rem",
														}}>
														Annuler
													</button>
													<button
														className="btn-primary btn-sm"
														onClick={handleQuickAdd}
														disabled={
															quickAddSaving ||
															!quickAddTitle.trim()
														}
														style={{
															fontSize: "0.78rem",
															padding:
																"0.3rem 0.65rem",
														}}>
														{quickAddSaving
															? "..."
															: "Ajouter"}
													</button>
												</div>
											</div>
										</div>
									)}
								</div>
							)}
						</div>
					)}

					{/* KANBAN VIEW */}
					{viewMode === "kanban" && (
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "repeat(3,1fr)",
								gap: "1rem",
							}}>
							{KANBAN_COLS.map((col) => {
								const colTasks = displayed.filter(
									(t) => t.status === col.status,
								);
								const isDragTarget =
									kanbanDragOverCol === col.status;

								return (
									<div key={col.status}>
										{/* Column header */}
										<div
											style={{
												display: "flex",
												alignItems: "center",
												gap: "0.5rem",
												marginBottom: "0.75rem",
											}}>
											<span
												style={{
													width: "10px",
													height: "10px",
													borderRadius: "50%",
													background: col.color,
													flexShrink: 0,
												}}
											/>
											<span
												style={{
													fontWeight: 700,
													fontSize: "0.875rem",
												}}>
												{col.label}
											</span>
											<span
												style={{
													marginLeft: "auto",
													background: "var(--bg-alt)",
													borderRadius: "999px",
													padding: "0.1rem 0.55rem",
													fontSize: "0.72rem",
													color: "var(--text-muted)",
													fontWeight: 600,
												}}>
												{colTasks.length}
											</span>
										</div>

										{/* Drop zone */}
										<div
											className={`kanban-col-drop-zone${isDragTarget ? " drag-over" : ""}`}
											style={{
												display: "flex",
												flexDirection: "column",
												gap: "0.65rem",
											}}
											onDragOver={(e) =>
												handleKanbanDragOver(
													e,
													col.status,
												)
											}
											onDragLeave={handleKanbanDragLeave}
											onDrop={() =>
												handleKanbanDrop(col.status)
											}>
											{colTasks.map((t) => (
												<div
													key={t.id}
													className="card kanban-card"
													style={{
														borderLeft: `3px solid ${isOverdue(t) ? "var(--danger)" : PRIORITY_COLOR[t.priority]}`,
													}}
													draggable
													onDragStart={(e) => {
														// Prevent column zone from receiving this event too
														e.stopPropagation();
														handleKanbanDragStart(
															t,
														);
													}}
													onClick={() => {
														setSelectedTask(t);
														setDetailTab("details");
													}}>
													{/* Card title row */}
													<div
														style={{
															display: "flex",
															alignItems:
																"flex-start",
															gap: "0.5rem",
															marginBottom:
																"0.5rem",
														}}>
														{renderCheckbox(t)}
														<div
															style={{
																fontWeight: 600,
																fontSize:
																	"0.875rem",
																lineHeight: 1.4,
																flex: 1,
																textDecoration:
																	t.status ===
																	"realisee"
																		? "line-through"
																		: "none",
																opacity:
																	t.status ===
																	"realisee"
																		? 0.6
																		: 1,
															}}>
															{t.title}
														</div>
													</div>

													{/* Priority and project badges */}
													<div
														style={{
															display: "flex",
															gap: "0.25rem",
															marginBottom:
																"0.5rem",
															flexWrap: "wrap",
														}}>
														<span
															className={`badge ${PriorityBadges[t.priority]}`}
															style={{
																fontSize:
																	"0.62rem",
																padding:
																	"0.1rem 0.35rem",
															}}>
															{
																PriorityLabels[
																	t.priority
																]
															}
														</span>
														{t.project && (
															<span
																className="badge badge-light"
																style={{
																	fontSize:
																		"0.62rem",
																	padding:
																		"0.1rem 0.35rem",
																}}>
																{t.project
																	.emoji ||
																	""}{" "}
																{t.project.name}
															</span>
														)}
														{isOverdue(t) && (
															<span
																className="badge badge-danger"
																style={{
																	fontSize:
																		"0.62rem",
																	padding:
																		"0.1rem 0.35rem",
																}}>
																En retard
															</span>
														)}
													</div>

													{/* Card footer: assignee + meta */}
													<div
														style={{
															display: "flex",
															alignItems:
																"center",
															justifyContent:
																"space-between",
														}}>
														{t.assignee ? (
															<div
																style={{
																	display:
																		"flex",
																	alignItems:
																		"center",
																	gap: "0.35rem",
																}}>
																{renderAvatar(
																	t.assignee
																		.name,
																	t.assignee
																		.avatar ??
																		null,
																	20,
																)}
																<span
																	style={{
																		fontSize:
																			"0.72rem",
																		color: "var(--text-muted)",
																	}}>
																	{
																		t
																			.assignee
																			.name
																	}
																</span>
															</div>
														) : (
															<span />
														)}
														<div
															style={{
																display: "flex",
																alignItems:
																	"center",
																gap: "0.45rem",
															}}>
															{(t.comments
																?.length ?? 0) >
																0 && (
																<span
																	style={{
																		display:
																			"flex",
																		alignItems:
																			"center",
																		gap: "0.15rem",
																		fontSize:
																			"0.68rem",
																		color: "var(--text-muted)",
																	}}>
																	<svg
																		width="10"
																		height="10"
																		viewBox="0 0 24 24"
																		fill="none"
																		stroke="currentColor"
																		strokeWidth="2">
																		<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
																	</svg>
																	{
																		t
																			.comments!
																			.length
																	}
																</span>
															)}
															{t.dueDate && (
																<span
																	style={{
																		fontSize:
																			"0.7rem",
																		color: isOverdue(
																			t,
																		)
																			? "var(--danger)"
																			: "var(--text-muted)",
																		fontWeight:
																			isOverdue(
																				t,
																			)
																				? 600
																				: 400,
																	}}>
																	{formatDateShort(
																		t.dueDate,
																	)}
																</span>
															)}
														</div>
													</div>

													{/* Quick status move buttons */}
													<div
														style={{
															display: "flex",
															gap: "0.3rem",
															marginTop:
																"0.55rem",
															borderTop:
																"1px solid var(--border-color)",
															paddingTop:
																"0.45rem",
														}}
														onClick={(e) =>
															e.stopPropagation()
														}>
														{KANBAN_COLS.filter(
															(c) =>
																c.status !==
																col.status,
														).map((c) => (
															<button
																key={c.status}
																className="kanban-move-btn"
																onClick={() =>
																	handleStatusChange(
																		t,
																		c.status,
																	)
																}>
																{c.label}
															</button>
														))}
													</div>
												</div>
											))}

											{colTasks.length === 0 && (
												<div
													style={{
														padding: "1.5rem",
														textAlign: "center",
														fontSize: "0.8rem",
														color: "var(--text-muted)",
														border: "1.5px dashed var(--border-color)",
														borderRadius: "10px",
													}}>
													Aucune tache
												</div>
											)}
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>
			</div>

			{/* DETAIL MODAL — shown when a task is selected */}
			{selectedTask && (
				<div
					className="modal-overlay"
					onClick={(e) => {
						if (e.target === e.currentTarget) setSelectedTask(null);
					}}>
					<div
						className="modal-content detail-modal-enter"
						style={{
							maxWidth: "680px",
							width: "100%",
							maxHeight: "85vh",
							display: "flex",
							flexDirection: "column",
						}}>
						{/* Modal header */}
						<div
							style={{
								padding: "1rem 1.25rem 0.75rem",
								borderBottom: "1px solid var(--border-color)",
								display: "flex",
								alignItems: "flex-start",
								gap: "0.75rem",
							}}>
							<div style={{ flex: 1, minWidth: 0 }}>
								{/* Title + checkbox */}
								<div
									style={{
										display: "flex",
										alignItems: "center",
										gap: "0.5rem",
										marginBottom: "0.5rem",
									}}>
									{renderCheckbox(selectedTask)}
									<h3
										style={{
											margin: 0,
											fontSize: "1rem",
											fontWeight: 700,
											lineHeight: 1.4,
											textDecoration:
												selectedTask.status ===
												"realisee"
													? "line-through"
													: "none",
											opacity:
												selectedTask.status ===
												"realisee"
													? 0.6
													: 1,
										}}>
										{selectedTask.title}
									</h3>
								</div>
								{/* Status + priority badges */}
								<div
									style={{
										display: "flex",
										gap: "0.35rem",
										flexWrap: "wrap",
									}}>
									<span
										className={`badge ${TaskStatusBadges[selectedTask.status]}`}
										style={{ fontSize: "0.68rem" }}>
										{TaskStatusLabels[selectedTask.status]}
									</span>
									<span
										className={`badge ${PriorityBadges[selectedTask.priority]}`}
										style={{ fontSize: "0.68rem" }}>
										{PriorityLabels[selectedTask.priority]}
									</span>
									{isOverdue(selectedTask) && (
										<span
											className="badge badge-danger"
											style={{ fontSize: "0.68rem" }}>
											En retard
										</span>
									)}
								</div>
							</div>
							<button
								className="btn-icon"
								onClick={() => setSelectedTask(null)}>
								<svg
									width="15"
									height="15"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2">
									<line x1="18" y1="6" x2="6" y2="18" />
									<line x1="6" y1="6" x2="18" y2="18" />
								</svg>
							</button>
						</div>

						{/* Tabs */}
						<div
							style={{
								display: "flex",
								borderBottom: "1px solid var(--border-color)",
							}}>
							{(
								[
									{ key: "details", label: "Details" },
									{
										key: "comments",
										label: `Commentaires (${selectedTask.comments?.length ?? 0})`,
									},
									{ key: "activity", label: "Activite" },
								] as const
							).map((tab) => (
								<button
									key={tab.key}
									className={`detail-tab-btn ${detailTab === tab.key ? "active" : ""}`}
									onClick={() => setDetailTab(tab.key)}>
									{tab.label}
								</button>
							))}
						</div>

						{/* Tab body */}
						<div
							style={{
								padding: "1rem 1.25rem",
								flex: 1,
								overflowY: "auto",
							}}>
							{/* DETAILS TAB */}
							{detailTab === "details" && (
								<>
									{/* Meta grid */}
									<div
										style={{
											display: "grid",
											gridTemplateColumns: "1fr 1fr",
											gap: "0.75rem",
											marginBottom: "1rem",
											fontSize: "0.82rem",
										}}>
										<div>
											<div
												className="filter-label"
												style={{
													marginBottom: "0.25rem",
												}}>
												Assigne
											</div>
											<div
												style={{
													fontWeight: 600,
													display: "flex",
													alignItems: "center",
													gap: "0.35rem",
												}}>
												{selectedTask.assignee ? (
													<>
														{renderAvatar(
															selectedTask
																.assignee.name,
															selectedTask
																.assignee
																.avatar ?? null,
															20,
														)}
														{
															selectedTask
																.assignee.name
														}
													</>
												) : (
													"Non assigne"
												)}
											</div>
										</div>
										<div>
											<div
												className="filter-label"
												style={{
													marginBottom: "0.25rem",
												}}>
												Projet
											</div>
											<div style={{ fontWeight: 600 }}>
												{selectedTask.project
													? `${selectedTask.project.emoji || ""} ${selectedTask.project.name}`
													: "Aucun"}
											</div>
										</div>
										<div>
											<div
												className="filter-label"
												style={{
													marginBottom: "0.25rem",
												}}>
												Echeance
											</div>
											<div
												style={{
													fontWeight: 600,
													color: isOverdue(
														selectedTask,
													)
														? "var(--danger)"
														: undefined,
												}}>
												{selectedTask.dueDate
													? formatDate(
															selectedTask.dueDate,
														)
													: "Non definie"}
												{isOverdue(selectedTask) && (
													<span
														style={{
															fontSize: "0.68rem",
															marginLeft:
																"0.3rem",
														}}>
														(en retard)
													</span>
												)}
											</div>
										</div>
										<div>
											<div
												className="filter-label"
												style={{
													marginBottom: "0.25rem",
												}}>
												Creee le
											</div>
											<div style={{ fontWeight: 600 }}>
												{formatDate(
													selectedTask.createdAt,
												)}
											</div>
										</div>
									</div>

									{/* Status change buttons */}
									<div style={{ marginBottom: "1rem" }}>
										<div
											className="filter-label"
											style={{ marginBottom: "0.4rem" }}>
											Changer le statut
										</div>
										<div
											style={{
												display: "flex",
												gap: "0.3rem",
												flexWrap: "wrap",
											}}>
											{Object.entries(TaskStatusLabels).map(
												([key, label]) => (
													<button
														key={key}
														className={`badge ${TaskStatusBadges[key]} status-change-badge`}
														onClick={() =>
															handleStatusChange(
																selectedTask,
																key as Task["status"],
															)
														}
														style={{
															fontSize: "0.68rem",
															opacity:
																selectedTask.status ===
																key
																	? 1
																	: 0.55,
															border:
																selectedTask.status ===
																key
																	? `2px solid ${TaskStatusColors[key]}`
																	: "2px solid transparent",
														}}>
														{label}
													</button>
												),
											)}
										</div>
									</div>

									{/* Description */}
									{selectedTask.description && (
										<div style={{ marginBottom: "1rem" }}>
											<div
												className="filter-label"
												style={{
													marginBottom: "0.4rem",
												}}>
												Description
											</div>
											<div
												style={{
													background: "var(--bg-alt)",
													borderRadius: "8px",
													padding: "0.75rem 0.85rem",
													border: "1px solid var(--border-color)",
												}}>
												<p
													style={{
														margin: 0,
														fontSize: "0.85rem",
														color: "var(--text-secondary)",
														lineHeight: 1.6,
														whiteSpace: "pre-wrap",
													}}>
													{selectedTask.description}
												</p>
											</div>
										</div>
									)}

									{/* Subtasks parsed from description */}
									<div style={{ marginBottom: "1rem" }}>
										<div
											className="filter-label"
											style={{ marginBottom: "0.4rem" }}>
											Sous-taches
										</div>
										{(() => {
											const subtasks = parseSubtasks(
												selectedTask.description,
											);
											if (subtasks.length === 0) {
												return (
													<div
														style={{
															fontSize: "0.8rem",
															color: "var(--text-muted)",
															fontStyle: "italic",
															padding: "0.5rem 0",
														}}>
														Aucune sous-tache
													</div>
												);
											}
											const doneCount = subtasks.filter(
												(s) => s.done,
											).length;
											return (
												<div>
													{/* Progress bar */}
													<div
														style={{
															display: "flex",
															alignItems:
																"center",
															gap: "0.5rem",
															marginBottom:
																"0.5rem",
														}}>
														<div
															style={{
																flex: 1,
																height: "4px",
																background:
																	"var(--bg-alt)",
																borderRadius:
																	"2px",
																overflow:
																	"hidden",
															}}>
															<div
																style={{
																	height: "100%",
																	background:
																		"var(--success)",
																	borderRadius:
																		"2px",
																	width: `${(doneCount / subtasks.length) * 100}%`,
																	transition:
																		"width 0.3s ease",
																}}
															/>
														</div>
														<span
															style={{
																fontSize:
																	"0.7rem",
																color: "var(--text-muted)",
																whiteSpace:
																	"nowrap",
															}}>
															{doneCount}/
															{subtasks.length}
														</span>
													</div>
													{/* Subtask rows */}
													{subtasks.map((st, idx) => (
														<div
															key={idx}
															style={{
																display: "flex",
																alignItems:
																	"center",
																gap: "0.5rem",
																padding:
																	"0.35rem 0",
																borderBottom:
																	idx <
																	subtasks.length -
																		1
																		? "1px solid var(--border-color)"
																		: "none",
															}}>
															<div
																style={{
																	width: "16px",
																	height: "16px",
																	borderRadius:
																		"3px",
																	border: st.done
																		? "none"
																		: "1.5px solid var(--border-color)",
																	background:
																		st.done
																			? "var(--success)"
																			: "transparent",
																	display:
																		"flex",
																	alignItems:
																		"center",
																	justifyContent:
																		"center",
																	flexShrink: 0,
																}}>
																{st.done && (
																	<svg
																		width="10"
																		height="10"
																		viewBox="0 0 24 24"
																		fill="none"
																		stroke="#fff"
																		strokeWidth="3">
																		<polyline points="20 6 9 17 4 12" />
																	</svg>
																)}
															</div>
															<span
																style={{
																	fontSize:
																		"0.82rem",
																	textDecoration:
																		st.done
																			? "line-through"
																			: "none",
																	color: st.done
																		? "var(--text-muted)"
																		: "var(--text)",
																}}>
																{st.text}
															</span>
														</div>
													))}
												</div>
											);
										})()}
									</div>

									{/* Edit / delete actions */}
									<div
										style={{
											display: "flex",
											gap: "0.5rem",
										}}>
										<button
											className="btn-secondary btn-sm"
											style={{ flex: 1 }}
											onClick={() =>
												openEdit(selectedTask)
											}>
											<svg
												width="13"
												height="13"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												strokeWidth="2">
												<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
												<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
											</svg>
											Modifier
										</button>
										<button
											className="btn-icon delete"
											onClick={() =>
												handleDelete(selectedTask)
											}>
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
										</button>
									</div>
								</>
							)}

							{/* COMMENTS TAB */}
							{detailTab === "comments" && (
								<div
									style={{
										display: "flex",
										flexDirection: "column",
										height: "100%",
									}}>
									{/* Comment list */}
									<div
										style={{
											flex: 1,
											display: "flex",
											flexDirection: "column",
											gap: "0.65rem",
											marginBottom: "0.75rem",
										}}>
										{(selectedTask.comments ?? []).map(
											(c) => (
												<div
													key={c.id}
													style={{
														background:
															"var(--bg-alt)",
														borderRadius: "10px",
														padding:
															"0.7rem 0.85rem",
														border: "1px solid var(--border-color)",
													}}>
													<div
														style={{
															display: "flex",
															alignItems:
																"center",
															gap: "0.4rem",
															marginBottom:
																"0.35rem",
														}}>
														{renderAvatar(
															c.user?.name || "?",
															c.user?.avatar ??
																null,
															22,
														)}
														<span
															style={{
																fontSize:
																	"0.8rem",
																fontWeight: 700,
															}}>
															{c.user?.name ||
																"--"}
														</span>
														<span
															style={{
																fontSize:
																	"0.68rem",
																color: "var(--text-muted)",
																marginLeft:
																	"auto",
															}}>
															{formatDateTime(
																c.createdAt,
															)}
														</span>
													</div>
													<p
														style={{
															margin: 0,
															fontSize: "0.85rem",
															color: "var(--text-secondary)",
															lineHeight: 1.55,
														}}>
														{c.content}
													</p>
												</div>
											),
										)}

										{(selectedTask.comments?.length ??
											0) === 0 && (
											<div
												style={{
													textAlign: "center",
													padding: "2rem 1rem",
												}}>
												<svg
													width="32"
													height="32"
													viewBox="0 0 24 24"
													fill="none"
													stroke="var(--border-color)"
													strokeWidth="1.5"
													style={{
														marginBottom: "0.5rem",
													}}>
													<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
												</svg>
												<p
													style={{
														margin: 0,
														fontSize: "0.82rem",
														color: "var(--text-muted)",
													}}>
													Aucun commentaire
												</p>
											</div>
										)}
									</div>

									{/* Comment input */}
									<div
										style={{
											display: "flex",
											gap: "0.5rem",
											position: "sticky",
											bottom: 0,
											background: "var(--card-bg)",
											paddingTop: "0.5rem",
											borderTop:
												"1px solid var(--border-color)",
										}}>
										<input
											value={comment}
											onChange={(e) =>
												setComment(e.target.value)
											}
											placeholder="Ajouter un commentaire..."
											style={{
												flex: 1,
												padding: "0.6rem 0.85rem",
												border: "1.5px solid var(--border-color)",
												borderRadius: "8px",
												background: "var(--card-bg)",
												color: "var(--text)",
												fontSize: "0.85rem",
												fontFamily: "inherit",
											}}
											onKeyDown={(e) => {
												if (
													e.key === "Enter" &&
													!e.shiftKey
												) {
													e.preventDefault();
													handlePostComment();
												}
											}}
										/>
										<button
											className="btn-send-icon"
											onClick={handlePostComment}
											disabled={
												postingComment ||
												!comment.trim()
											}>
											<svg
												width="14"
												height="14"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												strokeWidth="2">
												<line
													x1="22"
													y1="2"
													x2="11"
													y2="13"
												/>
												<polygon points="22 2 15 22 11 13 2 9 22 2" />
											</svg>
										</button>
									</div>
								</div>
							)}

							{/* ACTIVITY TAB */}
							{detailTab === "activity" && (
								<div className="pj-timeline">
									{[
										...(selectedTask.comments ?? []).map(
											(c) => ({
												type: "comment" as const,
												date: c.createdAt,
												user: c.user?.name || "Inconnu",
												avatar:
													c.user?.avatar ||
													(
														c.user?.name || "?"
													).charAt(0),
												text: c.content,
											}),
										),
										{
											type: "created" as const,
											date: selectedTask.createdAt,
											user:
												selectedTask.assignee?.name ||
												"Systeme",
											avatar:
												selectedTask.assignee?.avatar ||
												"?",
											text: `Tache "${selectedTask.title}" creee`,
										},
									]
										.sort(
											(a, b) =>
												new Date(b.date).getTime() -
												new Date(a.date).getTime(),
										)
										.map((item, idx, arr) => (
											<div
												key={idx}
												className={`pj-timeline-item ${idx === arr.length - 1 ? "last" : ""}`}>
												<div
													className="pj-timeline-dot"
													style={{
														borderColor:
															item.type ===
															"created"
																? "var(--success)"
																: "var(--accent)",
													}}
												/>
												<div className="pj-timeline-content">
													<div className="pj-timeline-header">
														<span className="pj-timeline-action">
															{item.type ===
															"created"
																? "Creation"
																: "Commentaire"}
														</span>
														<span className="pj-timeline-time">
															{formatDateTime(
																item.date,
															)}
														</span>
													</div>
													<div className="pj-timeline-user">
														{renderAvatar(
															item.user,
															item.avatar,
															16,
														)}
														{item.user}
													</div>
													<div className="pj-timeline-detail">
														{item.text}
													</div>
												</div>
											</div>
										))}
								</div>
							)}
						</div>
					</div>
				</div>
			)}

			{/* CREATE / EDIT TASK MODAL */}
			{showCreateModal && (
				<div className="modal-overlay">
					<div
						className="modal-content"
						style={{ maxWidth: "520px" }}>
						<div className="modal-header">
							<h3>
								{editMode ? (
									<svg
										width="18"
										height="18"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										style={{ marginRight: "0.35rem" }}>
										<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
										<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
									</svg>
								) : (
									<svg
										width="18"
										height="18"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										style={{ marginRight: "0.35rem" }}>
										<line x1="12" y1="5" x2="12" y2="19" />
										<line x1="5" y1="12" x2="19" y2="12" />
									</svg>
								)}
								{editMode
									? "Modifier la tache"
									: "Nouvelle tache"}
							</h3>
							<button
								className="btn-icon"
								onClick={() => setShowCreateModal(false)}>
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

						<div className="modal-body">
							<div className="form-group">
								<label>Titre *</label>
								<input
									value={form.title}
									onChange={(e) =>
										setForm({
											...form,
											title: e.target.value,
										})
									}
									placeholder="Que faut-il faire ?"
									autoFocus
								/>
							</div>

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
									rows={4}
									placeholder={
										"Ajoutez des details...\n\nUtilisez - [ ] pour les sous-taches"
									}
									style={{ resize: "vertical" }}
								/>
								<div
									style={{
										fontSize: "0.7rem",
										color: "var(--text-muted)",
										marginTop: "0.25rem",
									}}>
									Astuce : &quot;- [ ] tache&quot; pour creer
									des sous-taches
								</div>
							</div>

							{/* Priority selector */}
							<div className="form-group">
								<label>Priorite</label>
								<div style={{ display: "flex", gap: "0.4rem" }}>
									{(["high", "medium", "low"] as const).map(
										(p) => (
											<button
												key={p}
												type="button"
												onClick={() =>
													setForm({
														...form,
														priority: p,
													})
												}
												className={`badge ${PriorityBadges[p]}`}
												style={{
													cursor: "pointer",
													padding: "0.35rem 0.85rem",
													fontSize: "0.8rem",
													border:
														form.priority === p
															? `2px solid ${PRIORITY_COLOR[p]}`
															: "2px solid transparent",
													opacity:
														form.priority === p
															? 1
															: 0.5,
													transition:
														"all 0.12s ease",
												}}>
												{PriorityLabels[p]}
											</button>
										),
									)}
								</div>
							</div>

							<div
								style={{
									display: "grid",
									gridTemplateColumns: "1fr 1fr",
									gap: "1rem",
								}}>
								<div className="form-group">
									<label>Statut</label>
									<select
										value={form.status}
										onChange={(e) =>
											setForm({
												...form,
												status: e.target
													.value as Task["status"],
											})
										}>
										{Object.entries(TaskStatusLabels).map(
											([v, l]) => (
												<option key={v} value={v}>
													{l}
												</option>
											),
										)}
									</select>
								</div>
								<div className="form-group">
									<label>Date d&apos;echeance</label>
									<input
										type="date"
										value={form.dueDate}
										onChange={(e) =>
											setForm({
												...form,
												dueDate: e.target.value,
											})
										}
									/>
								</div>
								<div className="form-group">
									<label>Assigne</label>
									<select
										value={form.assigneeId}
										onChange={(e) =>
											setForm({
												...form,
												assigneeId: e.target.value,
											})
										}>
										<option value="">Non assigne</option>
										{users.map((u) => (
											<option
												key={u.id}
												value={String(u.id)}>
												{u.name}
											</option>
										))}
									</select>
								</div>
								<div className="form-group">
									<label>Projet</label>
									<select
										value={form.projectId}
										onChange={(e) =>
											setForm({
												...form,
												projectId: e.target.value,
											})
										}>
										<option value="">Aucun projet</option>
										{projects.map((p) => (
											<option
												key={p.id}
												value={String(p.id)}>
												{p.emoji ? `${p.emoji} ` : ""}
												{p.name}
											</option>
										))}
									</select>
								</div>
							</div>
						</div>

						<div className="modal-footer">
							<button
								className="btn-secondary btn-sm"
								onClick={() => setShowCreateModal(false)}>
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
		</>
	);
}
