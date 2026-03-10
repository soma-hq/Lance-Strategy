"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import api from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { useConfirm } from "@/hooks/useConfirm";
import type { Event, User, Project, Task } from "@/types";
import { TaskStatusColors } from "@/types/constants";

// Event type color palette
const EVENT_COLORS: Record<string, string> = {
	meeting: "#2e4a8a",
	deadline: "#c0392b",
	reminder: "#b8923a",
	other: "#666680",
};

// Human-readable labels for filter pills
const EVENT_LABELS: Record<string, string> = {
	meeting: "Reunion",
	deadline: "Echeance",
	reminder: "Rappel",
	other: "Autre",
};

// Light background tints for badges
const EVENT_BG_LIGHT: Record<string, string> = {
	meeting: "rgba(46,74,138,0.12)",
	deadline: "rgba(192,57,43,0.12)",
	reminder: "rgba(184,146,58,0.12)",
	other: "rgba(102,102,128,0.12)",
};

const RECURRENCE_LABELS: Record<string, string> = {
	none: "Aucune",
	daily: "Quotidienne",
	weekly: "Hebdomadaire",
	monthly: "Mensuelle",
};

const REMINDER_OPTIONS = [
	{ value: "none", label: "Aucun" },
	{ value: "15min", label: "15 minutes avant" },
	{ value: "30min", label: "30 minutes avant" },
	{ value: "1h", label: "1 heure avant" },
	{ value: "1d", label: "1 jour avant" },
];

const MONTH_NAMES = [
	"Janvier",
	"Fevrier",
	"Mars",
	"Avril",
	"Mai",
	"Juin",
	"Juillet",
	"Aout",
	"Septembre",
	"Octobre",
	"Novembre",
	"Decembre",
];

const MONTH_NAMES_SHORT = [
	"Jan",
	"Fev",
	"Mar",
	"Avr",
	"Mai",
	"Juin",
	"Juil",
	"Aou",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
];

const DAY_NAMES = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const DAY_NAMES_FULL = [
	"Lundi",
	"Mardi",
	"Mercredi",
	"Jeudi",
	"Vendredi",
	"Samedi",
	"Dimanche",
];

type ViewMode = "month" | "week";

interface EventForm {
	title: string;
	description: string;
	type: Event["type"];
	date: string;
	startTime: string;
	endDate: string;
	endTime: string;
	allDay: boolean;
	userId: string;
	participants: number[];
	recurrence: string;
	location: string;
	projectId: string;
	reminder: string;
	priority: string;
}

const INITIAL_FORM: EventForm = {
	title: "",
	description: "",
	type: "reminder",
	date: "",
	startTime: "09:00",
	endDate: "",
	endTime: "10:00",
	allDay: true,
	userId: "",
	participants: [],
	recurrence: "none",
	location: "",
	projectId: "",
	reminder: "none",
	priority: "normal",
};

// Combined calendar item union type
type CalItem = { kind: "event"; data: Event } | { kind: "task"; data: Task };

/**
 * Build a 6-row x 7-col month grid of Date objects (Mon-Sun)
 * @param year - Full year number
 * @param month - Zero-indexed month
 * @returns Array of 42 Date objects
 */

function buildMonthGrid(year: number, month: number): Date[] {
	const firstDay = new Date(year, month, 1);
	const startOffset = (firstDay.getDay() + 6) % 7;
	const grid: Date[] = [];
	for (let i = 0 - startOffset; i < 42 - startOffset; i++) {
		grid.push(new Date(year, month, 1 + i));
	}
	return grid;
}

/**
 * Build a week grid starting from Monday of the given date's week
 * @param date - Any date within the target week
 * @returns Array of 7 Date objects (Mon-Sun)
 */

function buildWeekGrid(date: Date): Date[] {
	const d = new Date(date);
	const day = d.getDay();
	const diff = (day + 6) % 7;
	d.setDate(d.getDate() - diff);
	const grid: Date[] = [];
	for (let i = 0; i < 7; i++) {
		grid.push(new Date(d.getFullYear(), d.getMonth(), d.getDate() + i));
	}
	return grid;
}

/**
 * Format a date to ISO date string (YYYY-MM-DD)
 * @param d - Date to format
 * @returns ISO date string
 */

function toISO(d: Date): string {
	return d.toISOString().slice(0, 10);
}

/**
 * Check if two dates represent the same calendar day
 * @param a - First date
 * @param b - Second date
 * @returns True if same day
 */

function sameDay(a: Date, b: Date): boolean {
	return (
		a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate()
	);
}

/**
 * Format time from a date string or Date
 * @param d - Date input
 * @returns Formatted HH:MM string
 */

function formatTime(d: Date | string): string {
	const date = new Date(d);
	return date.toLocaleTimeString("fr-FR", {
		hour: "2-digit",
		minute: "2-digit",
	});
}

/**
 * Format date in French locale with weekday
 * @param d - Date input
 * @returns Full French date string
 */

function formatDateFR(d: Date | string): string {
	return new Date(d).toLocaleDateString("fr-FR", {
		weekday: "long",
		day: "numeric",
		month: "long",
		year: "numeric",
	});
}

/**
 * Get initials from a name
 * @param name - Full name string
 * @returns Up to 2 uppercase initials
 */

function getInitials(name: string): string {
	return name
		.split(" ")
		.map((w) => w[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

/**
 * Map any event type to one of the 4 filter buckets
 * @param type - Raw event type string
 * @returns Bucket key: meeting, deadline, reminder, or other
 */

function getFilterBucket(type: string): string {
	if (type === "meeting") return "meeting";
	if (type === "deadline") return "deadline";
	if (type === "reminder") return "reminder";
	return "other";
}

/**
 * Participant multi-select dropdown component
 * @param users - All available users
 * @param selected - Currently selected user IDs
 * @param onChange - Callback when selection changes
 * @returns Participant selector JSX
 */

function ParticipantSelect({
	users,
	selected,
	onChange,
}: {
	users: User[];
	selected: number[];
	onChange: (ids: number[]) => void;
}) {
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");
	const ref = useRef<HTMLDivElement>(null);

	// Close dropdown on outside click
	useEffect(() => {
		/**
		 * Close if click is outside dropdown
		 * @param e - Mouse event
		 */
		function handleClick(e: MouseEvent) {
			if (ref.current && !ref.current.contains(e.target as Node)) {
				setOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClick);
		return () => document.removeEventListener("mousedown", handleClick);
	}, []);

	const filtered = users.filter((u) =>
		u.name.toLowerCase().includes(search.toLowerCase()),
	);

	/**
	 * Toggle a user in the selection
	 * @param id - User ID to toggle
	 */
	const toggle = (id: number) => {
		if (selected.includes(id)) {
			onChange(selected.filter((s) => s !== id));
		} else {
			onChange([...selected, id]);
		}
	};

	return (
		<div ref={ref} style={{ position: "relative" }}>
			<div
				onClick={() => setOpen(!open)}
				style={{
					border: "1px solid var(--border-color)",
					borderRadius: "6px",
					padding: "0.45rem 0.65rem",
					minHeight: "38px",
					cursor: "pointer",
					display: "flex",
					flexWrap: "wrap",
					gap: "4px",
					alignItems: "center",
					background: "var(--card-bg)",
					fontSize: "0.82rem",
				}}>
				{selected.length === 0 ? (
					<span style={{ color: "var(--text-muted)" }}>
						Selectionner des participants...
					</span>
				) : (
					selected.map((id) => {
						const u = users.find((u) => u.id === id);
						return (
							<span
								key={id}
								style={{
									background: "var(--accent)",
									color: "#fff",
									borderRadius: "4px",
									padding: "1px 8px",
									fontSize: "0.72rem",
									fontWeight: 500,
									display: "inline-flex",
									alignItems: "center",
									gap: "4px",
								}}>
								{u?.name || `#${id}`}
								<span
									onClick={(e) => {
										e.stopPropagation();
										toggle(id);
									}}
									style={{
										cursor: "pointer",
										marginLeft: "2px",
										fontWeight: 700,
										fontSize: "0.8rem",
										lineHeight: 1,
									}}>
									x
								</span>
							</span>
						);
					})
				)}
			</div>
			{open && (
				<div
					style={{
						position: "absolute",
						top: "100%",
						left: 0,
						right: 0,
						marginTop: "4px",
						background: "var(--card-bg)",
						border: "1px solid var(--border-color)",
						borderRadius: "6px",
						boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
						zIndex: 50,
						maxHeight: "200px",
						overflowY: "auto",
					}}>
					<div style={{ padding: "6px" }}>
						<input
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Rechercher..."
							style={{
								width: "100%",
								border: "1px solid var(--border-color)",
								borderRadius: "4px",
								padding: "5px 8px",
								fontSize: "0.78rem",
								background: "var(--bg-alt)",
							}}
							autoFocus
						/>
					</div>
					{filtered.map((u) => (
						<div
							key={u.id}
							onClick={() => toggle(u.id)}
							style={{
								padding: "6px 10px",
								cursor: "pointer",
								display: "flex",
								alignItems: "center",
								gap: "8px",
								fontSize: "0.8rem",
								background: selected.includes(u.id)
									? "var(--bg-alt)"
									: "transparent",
							}}
							onMouseEnter={(e) => {
								(
									e.currentTarget as HTMLDivElement
								).style.background = "var(--bg-alt)";
							}}
							onMouseLeave={(e) => {
								(
									e.currentTarget as HTMLDivElement
								).style.background = selected.includes(u.id)
									? "var(--bg-alt)"
									: "transparent";
							}}>
							<div
								style={{
									width: "24px",
									height: "24px",
									borderRadius: "50%",
									background: selected.includes(u.id)
										? "var(--accent)"
										: "var(--border-color)",
									color: selected.includes(u.id)
										? "#fff"
										: "var(--text)",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									fontSize: "0.6rem",
									fontWeight: 700,
									flexShrink: 0,
								}}>
								{u.avatar ? (
									<img
										src={u.avatar}
										alt={u.name}
										style={{
											width: "100%",
											height: "100%",
											borderRadius: "50%",
											objectFit: "cover",
										}}
									/>
								) : (
									getInitials(u.name)
								)}
							</div>
							<span style={{ flex: 1 }}>{u.name}</span>
							{selected.includes(u.id) && (
								<svg
									width="14"
									height="14"
									viewBox="0 0 24 24"
									fill="none"
									stroke="var(--accent)"
									strokeWidth="2.5">
									<polyline points="20 6 9 17 4 12" />
								</svg>
							)}
						</div>
					))}
					{filtered.length === 0 && (
						<div
							style={{
								padding: "12px",
								textAlign: "center",
								fontSize: "0.78rem",
								color: "var(--text-muted)",
							}}>
							Aucun utilisateur trouve
						</div>
					)}
				</div>
			)}
		</div>
	);
}

/**
 * Calendar page: month/week grid, inline filters, cross-page task data, event CRUD
 * @returns Calendar page component
 */

export default function CalendarPage() {
	const { user } = useAuth();
	const { showToast } = useToast();
	const confirm = useConfirm();

	const now = new Date();

	// View state
	const [viewYear, setViewYear] = useState(now.getFullYear());
	const [viewMonth, setViewMonth] = useState(now.getMonth());
	const [viewMode, setViewMode] = useState<ViewMode>("month");
	const [weekStart, setWeekStart] = useState<Date>(() => {
		const d = new Date();
		const diff = (d.getDay() + 6) % 7;
		d.setDate(d.getDate() - diff);
		return new Date(d.getFullYear(), d.getMonth(), d.getDate());
	});

	// Data state
	const [events, setEvents] = useState<Event[]>([]);
	const [tasks, setTasks] = useState<Task[]>([]);
	const [users, setUsers] = useState<User[]>([]);
	const [projects, setProjects] = useState<Project[]>([]);
	const [loading, setLoading] = useState(true);

	// Type filter state
	const [typeFilters, setTypeFilters] = useState<Record<string, boolean>>({
		meeting: true,
		deadline: true,
		reminder: true,
		other: true,
	});

	// Create/edit modal state
	const [showModal, setShowModal] = useState(false);
	const [editMode, setEditMode] = useState(false);
	const [editTarget, setEditTarget] = useState<Event | null>(null);
	const [form, setForm] = useState<EventForm>(INITIAL_FORM);
	const [saving, setSaving] = useState(false);

	// Detail modal state
	const [showDetail, setShowDetail] = useState(false);
	const [detailEvent, setDetailEvent] = useState<Event | null>(null);

	/**
	 * Load events for the visible date range
	 */
	const load = useCallback(async () => {
		setLoading(true);
		try {
			const from = new Date(viewYear, viewMonth - 1, 1)
				.toISOString()
				.slice(0, 10);
			const to = new Date(viewYear, viewMonth + 2, 0)
				.toISOString()
				.slice(0, 10);
			const data = await api.get<Event[]>(
				`/events?from=${from}&to=${to}`,
			);
			setEvents(data);
		} catch {
			showToast("Erreur de chargement", "error");
		} finally {
			setLoading(false);
		}
	}, [viewYear, viewMonth, showToast]);

	/**
	 * Load all users for participant display
	 */
	const loadUsers = useCallback(async () => {
		try {
			const data = await api.get<User[]>("/users");
			setUsers(data);
		} catch {
			/* silent */
		}
	}, []);

	/**
	 * Load all projects for linked project display
	 */
	const loadProjects = useCallback(async () => {
		try {
			const data = await api.get<Project[]>("/projects");
			setProjects(data);
		} catch {
			/* silent */
		}
	}, []);

	/**
	 * Load all tasks that have a due date for calendar display
	 */
	const loadTasks = useCallback(async () => {
		try {
			const data = await api.get<Task[]>("/tasks");
			setTasks(data.filter((t) => t.dueDate));
		} catch {
			/* silent */
		}
	}, []);

	useEffect(() => {
		load();
	}, [load]);

	useEffect(() => {
		loadUsers();
		loadProjects();
		loadTasks();
	}, [loadUsers, loadProjects, loadTasks]);

	// Month and week grids
	const monthGrid = useMemo(
		() => buildMonthGrid(viewYear, viewMonth),
		[viewYear, viewMonth],
	);

	const weekGrid = useMemo(() => buildWeekGrid(weekStart), [weekStart]);

	// Filtered events respecting type toggles
	const filteredEvents = useMemo(
		() => events.filter((e) => typeFilters[getFilterBucket(e.type)]),
		[events, typeFilters],
	);

	/**
	 * Get filtered events that fall on a given day
	 * @param day - Calendar day to query
	 * @returns Events on that day
	 */
	const getDayEvents = useCallback(
		(day: Date): Event[] => {
			return filteredEvents.filter((e) => {
				const start = new Date(e.date);
				const end = e.endDate ? new Date(e.endDate) : start;
				const dayOnly = new Date(
					day.getFullYear(),
					day.getMonth(),
					day.getDate(),
				);
				const startOnly = new Date(
					start.getFullYear(),
					start.getMonth(),
					start.getDate(),
				);
				const endOnly = new Date(
					end.getFullYear(),
					end.getMonth(),
					end.getDate(),
				);
				return (
					(dayOnly >= startOnly && dayOnly <= endOnly) ||
					sameDay(day, start) ||
					sameDay(day, end)
				);
			});
		},
		[filteredEvents],
	);

	/**
	 * Get tasks whose due date falls on a given day
	 * @param day - Calendar day to query
	 * @returns Tasks due that day
	 */
	const getDayTasks = useCallback(
		(day: Date): Task[] => {
			return tasks.filter(
				(t) =>
					t.dueDate &&
					!t.cancelled &&
					sameDay(new Date(t.dueDate), day),
			);
		},
		[tasks],
	);

	// Navigation handlers

	/**
	 * Navigate to the previous month
	 */
	const prevMonth = () => {
		if (viewMonth === 0) {
			setViewYear((y) => y - 1);
			setViewMonth(11);
		} else setViewMonth((m) => m - 1);
	};

	/**
	 * Navigate to the next month
	 */
	const nextMonth = () => {
		if (viewMonth === 11) {
			setViewYear((y) => y + 1);
			setViewMonth(0);
		} else setViewMonth((m) => m + 1);
	};

	/**
	 * Navigate to the previous week
	 */
	const prevWeek = () => {
		const d = new Date(weekStart);
		d.setDate(d.getDate() - 7);
		setWeekStart(d);
	};

	/**
	 * Navigate to the next week
	 */
	const nextWeek = () => {
		const d = new Date(weekStart);
		d.setDate(d.getDate() + 7);
		setWeekStart(d);
	};

	/**
	 * Jump to today in both month and week views
	 */
	const goToday = () => {
		const today = new Date();
		setViewYear(today.getFullYear());
		setViewMonth(today.getMonth());
		const diff = (today.getDay() + 6) % 7;
		const monday = new Date(today);
		monday.setDate(monday.getDate() - diff);
		setWeekStart(
			new Date(monday.getFullYear(), monday.getMonth(), monday.getDate()),
		);
	};

	// Event CRUD handlers

	/**
	 * Open the create event modal, optionally pre-filling the date
	 * @param date - Optional pre-selected date
	 */
	const openCreate = (date?: Date) => {
		setEditMode(false);
		setEditTarget(null);
		setForm({
			...INITIAL_FORM,
			userId: String(user?.id || ""),
			date: date ? toISO(date) : toISO(now),
			endDate: date ? toISO(date) : toISO(now),
		});
		setShowModal(true);
	};

	/**
	 * Open the edit modal for an existing event
	 * @param e - Event to edit
	 */
	const openEdit = (e: Event) => {
		setEditMode(true);
		setEditTarget(e);
		const startDate = new Date(e.date);
		const endDate = e.endDate ? new Date(e.endDate) : startDate;
		setForm({
			title: e.title,
			description: e.description || "",
			type: e.type,
			date: toISO(startDate),
			startTime: e.allDay
				? "09:00"
				: startDate.toLocaleTimeString("fr-FR", {
						hour: "2-digit",
						minute: "2-digit",
					}),
			endDate: toISO(endDate),
			endTime: e.allDay
				? "10:00"
				: endDate.toLocaleTimeString("fr-FR", {
						hour: "2-digit",
						minute: "2-digit",
					}),
			allDay: e.allDay,
			userId: String(e.userId),
			participants: [],
			recurrence: "none",
			location: "",
			projectId: e.projectId ? String(e.projectId) : "",
			reminder: "none",
			priority: "normal",
		});
		setShowModal(true);
	};

	/**
	 * Open the detail modal for an event
	 * @param e - Event to view
	 */
	const openDetail = (e: Event) => {
		setDetailEvent(e);
		setShowDetail(true);
	};

	/**
	 * Save a new or updated event to the API
	 */
	const handleSave = async () => {
		if (!form.title.trim() || !form.date) {
			showToast("Titre et date requis", "error");
			return;
		}
		setSaving(true);
		try {
			let dateStr = form.date;
			let endDateStr = form.endDate || form.date;
			if (!form.allDay) {
				dateStr = `${form.date}T${form.startTime}:00`;
				endDateStr = `${form.endDate || form.date}T${form.endTime}:00`;
			}
			const payload = {
				title: form.title.trim(),
				description: form.description || null,
				type: form.type,
				date: dateStr,
				endDate: endDateStr || null,
				allDay: form.allDay,
				userId: Number(form.userId) || user?.id,
				projectId: form.projectId ? Number(form.projectId) : null,
				participants: form.participants,
				recurrence: form.recurrence !== "none" ? form.recurrence : null,
				location: form.location || null,
				reminder: form.reminder !== "none" ? form.reminder : null,
				priority: form.priority,
			};
			if (editMode && editTarget) {
				await api.put(`/events/${editTarget.id}`, payload);
				showToast("Evenement modifie", "success");
			} else {
				await api.post("/events", payload);
				showToast("Evenement cree", "success");
			}
			setShowModal(false);
			load();
		} catch (e) {
			showToast((e as Error).message, "error");
		} finally {
			setSaving(false);
		}
	};

	/**
	 * Delete an event after confirmation
	 * @param e - Event to delete
	 */
	const handleDelete = async (e: Event) => {
		const ok = await confirm({
			title: "Supprimer l'evenement",
			message: `Supprimer "${e.title}" ?`,
			confirmLabel: "Supprimer",
			danger: true,
		});
		if (!ok) return;
		try {
			await api.delete(`/events/${e.id}`);
			showToast("Evenement supprime", "success");
			setShowDetail(false);
			setShowModal(false);
			load();
		} catch (err) {
			showToast((err as Error).message, "error");
		}
	};

	/**
	 * Toggle an event type filter on or off
	 * @param type - Filter bucket key
	 */
	const toggleFilter = (type: string) => {
		setTypeFilters((prev) => ({ ...prev, [type]: !prev[type] }));
	};

	// Week view label
	const weekLabel = useMemo(() => {
		const end = new Date(weekStart);
		end.setDate(end.getDate() + 6);
		const startStr = weekStart.toLocaleDateString("fr-FR", {
			day: "numeric",
			month: "short",
		});
		const endStr = end.toLocaleDateString("fr-FR", {
			day: "numeric",
			month: "short",
			year: "numeric",
		});
		return `${startStr} - ${endStr}`;
	}, [weekStart]);

	// Hour slots for the week time grid
	const hourSlots = useMemo(() => {
		const slots: string[] = [];
		for (let h = 7; h <= 21; h++) {
			slots.push(`${String(h).padStart(2, "0")}:00`);
		}
		return slots;
	}, []);

	// Render helpers

	/**
	 * Render a solid colored event chip for calendar cells
	 * @param e - Event to render
	 * @param compact - Use compact sizing
	 * @returns Event chip JSX element
	 */
	const renderEventChip = (e: Event, compact = false) => {
		const bucket = getFilterBucket(e.type);
		const color = EVENT_COLORS[bucket] || "#666680";
		const isMeeting = e.type === "meeting";
		const participants = (e as Event & { participants?: number[] })
			.participants;
		const participantCount = participants?.length || 0;
		const timeStr = !e.allDay ? formatTime(e.date) : "";

		return (
			<div
				key={e.id}
				onClick={(ev) => {
					ev.stopPropagation();
					openDetail(e);
				}}
				style={{
					background: color,
					color: "#fff",
					borderRadius: "4px",
					padding: compact ? "1px 4px" : "2px 6px",
					fontSize: compact ? "0.62rem" : "0.7rem",
					fontWeight: 500,
					overflow: "hidden",
					textOverflow: "ellipsis",
					whiteSpace: "nowrap",
					cursor: "pointer",
					display: "flex",
					alignItems: "center",
					gap: "3px",
					lineHeight: 1.3,
				}}
				title={`${e.title}${timeStr ? ` - ${timeStr}` : ""}`}>
				{!compact && timeStr && (
					<span style={{ opacity: 0.85, fontSize: "0.62rem" }}>
						{timeStr}
					</span>
				)}
				<span
					style={{
						overflow: "hidden",
						textOverflow: "ellipsis",
						flex: 1,
					}}>
					{e.title}
				</span>
				{isMeeting && participantCount > 0 && !compact && (
					<span
						style={{
							background: "rgba(255,255,255,0.25)",
							borderRadius: "3px",
							padding: "0 3px",
							fontSize: "0.58rem",
							fontWeight: 700,
							flexShrink: 0,
						}}>
						{participantCount}
						<svg
							width="8"
							height="8"
							viewBox="0 0 24 24"
							fill="currentColor"
							style={{
								marginLeft: "1px",
								verticalAlign: "middle",
							}}>
							<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
						</svg>
					</span>
				)}
			</div>
		);
	};

	/**
	 * Render a dashed outlined task chip for calendar cells
	 * @param t - Task to render
	 * @param compact - Use compact sizing
	 * @returns Task chip JSX element
	 */
	const renderTaskChip = (t: Task, compact = false) => {
		const isOverdue =
			t.dueDate && !t.completed && new Date(t.dueDate) < new Date();
		const color = t.completed
			? "var(--success)"
			: isOverdue
				? "var(--danger)"
				: TaskStatusColors[t.status] || "var(--warning)";

		return (
			<div
				key={`task-${t.id}`}
				style={{
					background: "transparent",
					color: color,
					border: `1.5px dashed ${color}`,
					borderRadius: "4px",
					padding: compact ? "1px 4px" : "2px 5px",
					fontSize: compact ? "0.6rem" : "0.67rem",
					fontWeight: 500,
					overflow: "hidden",
					textOverflow: "ellipsis",
					whiteSpace: "nowrap",
					cursor: "default",
					display: "flex",
					alignItems: "center",
					gap: "3px",
					lineHeight: 1.3,
					opacity: t.completed ? 0.6 : 1,
				}}
				title={t.title}>
				<svg
					width="8"
					height="8"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2.5"
					style={{ flexShrink: 0 }}>
					<polyline points="20 6 9 17 4 12" />
				</svg>
				<span
					style={{
						overflow: "hidden",
						textOverflow: "ellipsis",
						flex: 1,
					}}>
					{t.title}
				</span>
			</div>
		);
	};

	/**
	 * Get a user's display name by ID
	 * @param id - User ID
	 * @returns User name or fallback string
	 */
	const getUserName = (id: number): string => {
		const u = users.find((u) => u.id === id);
		return u?.name || `Utilisateur #${id}`;
	};

	/**
	 * Get a project's display name (with emoji) by ID
	 * @param id - Project ID
	 * @returns Project name string
	 */
	const getProjectName = (id: number): string => {
		const p = projects.find((p) => p.id === id);
		return p ? `${p.emoji || ""} ${p.name}`.trim() : `Projet #${id}`;
	};

	/**
	 * Build the combined sorted item list for a day cell
	 * @param day - Calendar day
	 * @returns Array of CalItem (events first, then tasks)
	 */
	const getDayItems = useCallback(
		(day: Date): CalItem[] => {
			const dayEvents = getDayEvents(day);
			const dayTasks = getDayTasks(day);
			return [
				...dayEvents.map((e) => ({ kind: "event" as const, data: e })),
				...dayTasks.map((t) => ({ kind: "task" as const, data: t })),
			];
		},
		[getDayEvents, getDayTasks],
	);

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
					</div>
					<div className="phb-text">
						<h1>Calendrier</h1>
						<p className="page-description">
							Evenements et planification
						</p>
					</div>
				</div>
				<div className="page-header-box-actions">
					{/* Month/week view toggle */}
					<div
						style={{
							display: "flex",
							borderRadius: "6px",
							overflow: "hidden",
							border: "1px solid var(--border-color)",
						}}>
						<button
							onClick={() => setViewMode("month")}
							style={{
								padding: "0.35rem 0.75rem",
								fontSize: "0.78rem",
								fontWeight: 600,
								border: "none",
								cursor: "pointer",
								background:
									viewMode === "month"
										? "var(--accent)"
										: "var(--card-bg)",
								color:
									viewMode === "month"
										? "#fff"
										: "var(--text)",
							}}>
							Mois
						</button>
						<button
							onClick={() => setViewMode("week")}
							style={{
								padding: "0.35rem 0.75rem",
								fontSize: "0.78rem",
								fontWeight: 600,
								border: "none",
								borderLeft: "1px solid var(--border-color)",
								cursor: "pointer",
								background:
									viewMode === "week"
										? "var(--accent)"
										: "var(--card-bg)",
								color:
									viewMode === "week"
										? "#fff"
										: "var(--text)",
							}}>
							Semaine
						</button>
					</div>

					{/* Month/week navigation */}
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: "0.5rem",
						}}>
						<button
							className="btn-secondary btn-sm"
							onClick={
								viewMode === "month" ? prevMonth : prevWeek
							}>
							<svg
								width="14"
								height="14"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2.5">
								<polyline points="15 18 9 12 15 6" />
							</svg>
						</button>
						<span
							style={{
								fontWeight: 700,
								fontSize: "0.95rem",
								minWidth: "180px",
								textAlign: "center",
							}}>
							{viewMode === "month"
								? `${MONTH_NAMES[viewMonth]} ${viewYear}`
								: weekLabel}
						</span>
						<button
							className="btn-secondary btn-sm"
							onClick={
								viewMode === "month" ? nextMonth : nextWeek
							}>
							<svg
								width="14"
								height="14"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2.5">
								<polyline points="9 18 15 12 9 6" />
							</svg>
						</button>
						<button
							className="btn-secondary btn-sm"
							onClick={goToday}>
							Aujourd&apos;hui
						</button>
					</div>

					<button
						className="btn-primary btn-sm"
						onClick={() => openCreate()}>
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
						Nouvel evenement
					</button>
				</div>
			</div>

			{/* Inline filter pills + calendar — full width */}
			<div>
				{/* Type filter pills */}
				<div
					style={{
						display: "flex",
						gap: "0.3rem",
						marginBottom: "0.75rem",
						flexWrap: "wrap",
						alignItems: "center",
					}}>
					<span
						style={{
							fontSize: "0.78rem",
							fontWeight: 600,
							color: "var(--text-muted)",
							marginRight: "0.25rem",
						}}>
						Filtres :
					</span>
					{Object.entries(EVENT_LABELS).map(([type, label]) => (
						<button
							key={type}
							onClick={() => toggleFilter(type)}
							style={{
								display: "flex",
								alignItems: "center",
								gap: "5px",
								padding: "0.3rem 0.7rem",
								borderRadius: "20px",
								border: `2px solid ${EVENT_COLORS[type]}`,
								background: typeFilters[type]
									? EVENT_COLORS[type]
									: "transparent",
								color: typeFilters[type]
									? "#fff"
									: EVENT_COLORS[type],
								fontSize: "0.75rem",
								fontWeight: 600,
								cursor: "pointer",
								transition: "all 0.15s ease",
							}}>
							<span
								style={{
									width: "7px",
									height: "7px",
									borderRadius: "50%",
									background: typeFilters[type]
										? "#fff"
										: EVENT_COLORS[type],
									flexShrink: 0,
								}}
							/>
							{label}
						</button>
					))}
					{/* Task chip legend */}
					<span
						style={{
							display: "flex",
							alignItems: "center",
							gap: "5px",
							padding: "0.3rem 0.65rem",
							borderRadius: "20px",
							border: "1.5px dashed var(--warning)",
							color: "var(--warning)",
							fontSize: "0.72rem",
							fontWeight: 600,
						}}>
						<svg
							width="8"
							height="8"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2.5">
							<polyline points="20 6 9 17 4 12" />
						</svg>
						Taches
					</span>
				</div>

				{/* Month view */}
				{viewMode === "month" && (
					<div
						className="card"
						style={{ padding: 0, overflow: "hidden" }}>
						{/* Day headers */}
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "repeat(7,1fr)",
								borderBottom: "1.5px solid var(--border-color)",
							}}>
							{DAY_NAMES.map((d) => (
								<div
									key={d}
									style={{
										padding: "0.6rem 0.5rem",
										textAlign: "center",
										fontSize: "0.75rem",
										fontWeight: 700,
										color: "var(--text-muted)",
										background: "var(--bg-alt)",
									}}>
									{d}
								</div>
							))}
						</div>

						{/* Calendar cells */}
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "repeat(7,1fr)",
								gridTemplateRows:
									"repeat(6, minmax(95px, 1fr))",
								overflow: "hidden",
							}}>
							{monthGrid.map((day, idx) => {
								const isCurrentMonth =
									day.getMonth() === viewMonth;
								const isToday = sameDay(day, now);
								const isPast = day < now && !isToday;
								const allItems = getDayItems(day);
								const visible = allItems.slice(0, 3);
								const overflow = allItems.length - 3;
								const dayEvents = getDayEvents(day);

								return (
									<div
										key={idx}
										onClick={() => openCreate(day)}
										style={{
											padding: "0.35rem 0.45rem",
											borderRight:
												(idx + 1) % 7 !== 0
													? "1px solid var(--border-color)"
													: "none",
											borderBottom:
												idx < 35
													? "1px solid var(--border-color)"
													: "none",
											background: !isCurrentMonth
												? "var(--bg-alt)"
												: isToday
													? "rgba(46,74,138,0.04)"
													: isPast
														? "rgba(0,0,0,0.01)"
														: undefined,
											cursor: "pointer",
											transition: "background 0.1s",
											minHeight: "95px",
											position: "relative",
										}}
										onMouseEnter={(e) => {
											(
												e.currentTarget as HTMLDivElement
											).style.background =
												"var(--surface-hover)";
										}}
										onMouseLeave={(e) => {
											const bg = !isCurrentMonth
												? "var(--bg-alt)"
												: isToday
													? "rgba(46,74,138,0.04)"
													: isPast
														? "rgba(0,0,0,0.01)"
														: "";
											(
												e.currentTarget as HTMLDivElement
											).style.background = bg;
										}}>
										{/* Day number + event type dots */}
										<div
											style={{
												display: "flex",
												alignItems: "center",
												justifyContent: "space-between",
												marginBottom: "0.2rem",
											}}>
											<div
												style={{
													display: "inline-flex",
													alignItems: "center",
													justifyContent: "center",
													width: "26px",
													height: "26px",
													borderRadius: "50%",
													fontSize: "0.8rem",
													fontWeight: isToday
														? 700
														: 500,
													color: isToday
														? "#fff"
														: !isCurrentMonth
															? "var(--text-muted)"
															: "var(--text)",
													background: isToday
														? "var(--accent)"
														: "transparent",
												}}>
												{day.getDate()}
											</div>
											{/* Colored type indicator dots */}
											{dayEvents.length > 0 && (
												<div
													style={{
														display: "flex",
														gap: "2px",
													}}>
													{Array.from(
														new Set(
															dayEvents.map((e) =>
																getFilterBucket(
																	e.type,
																),
															),
														),
													).map((t) => (
														<span
															key={t}
															style={{
																width: "6px",
																height: "6px",
																borderRadius:
																	"50%",
																background:
																	EVENT_COLORS[
																		t
																	],
															}}
														/>
													))}
												</div>
											)}
										</div>

										{/* Combined event + task chip list */}
										<div
											style={{
												display: "flex",
												flexDirection: "column",
												gap: "2px",
											}}>
											{visible.map((item, i) =>
												item.kind === "event"
													? renderEventChip(item.data)
													: renderTaskChip(item.data),
											)}
											{overflow > 0 && (
												<div
													onClick={(ev) =>
														ev.stopPropagation()
													}
													style={{
														fontSize: "0.65rem",
														color: "var(--text-muted)",
														paddingLeft: "0.2rem",
														fontWeight: 500,
													}}>
													+{overflow} autre
													{overflow > 1 ? "s" : ""}
												</div>
											)}
										</div>
									</div>
								);
							})}
						</div>
					</div>
				)}

				{/* Week view */}
				{viewMode === "week" && (
					<div
						className="card"
						style={{ padding: 0, overflow: "hidden" }}>
						{/* Day headers */}
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "60px repeat(7,1fr)",
								borderBottom: "1.5px solid var(--border-color)",
							}}>
							<div
								style={{
									padding: "0.6rem 0.5rem",
									background: "var(--bg-alt)",
									borderRight:
										"1px solid var(--border-color)",
								}}
							/>
							{weekGrid.map((day, idx) => {
								const isToday = sameDay(day, now);
								return (
									<div
										key={idx}
										style={{
											padding: "0.6rem 0.5rem",
											textAlign: "center",
											background: "var(--bg-alt)",
											borderRight:
												idx < 6
													? "1px solid var(--border-color)"
													: "none",
										}}>
										<div
											style={{
												fontSize: "0.7rem",
												fontWeight: 600,
												color: "var(--text-muted)",
												textTransform: "uppercase",
											}}>
											{DAY_NAMES_FULL[idx]}
										</div>
										<div
											style={{
												display: "inline-flex",
												alignItems: "center",
												justifyContent: "center",
												width: "28px",
												height: "28px",
												borderRadius: "50%",
												fontSize: "0.9rem",
												fontWeight: isToday ? 700 : 500,
												color: isToday
													? "#fff"
													: "var(--text)",
												background: isToday
													? "var(--accent)"
													: "transparent",
												marginTop: "2px",
											}}>
											{day.getDate()}
										</div>
									</div>
								);
							})}
						</div>

						{/* Hour grid */}
						<div
							style={{
								maxHeight: "600px",
								overflowY: "auto",
							}}>
							{hourSlots.map((hour) => (
								<div
									key={hour}
									style={{
										display: "grid",
										gridTemplateColumns:
											"60px repeat(7,1fr)",
										minHeight: "48px",
										borderBottom:
											"1px solid var(--border-color)",
									}}>
									<div
										style={{
											padding: "4px 8px",
											fontSize: "0.68rem",
											fontWeight: 500,
											color: "var(--text-muted)",
											textAlign: "right",
											borderRight:
												"1px solid var(--border-color)",
										}}>
										{hour}
									</div>
									{weekGrid.map((day, dayIdx) => {
										const dayEvts = getDayEvents(day);
										const hourNum = parseInt(hour);
										const hourEvents = dayEvts.filter(
											(e) => {
												if (e.allDay) return false;
												const d = new Date(e.date);
												return d.getHours() === hourNum;
											},
										);
										// Show all-day events and due tasks at the first hour slot
										const allDayEvts =
											hourNum === 7
												? dayEvts.filter(
														(e) => e.allDay,
													)
												: [];
										const dueTasks =
											hourNum === 7
												? getDayTasks(day)
												: [];

										return (
											<div
												key={dayIdx}
												onClick={() => openCreate(day)}
												style={{
													borderRight:
														dayIdx < 6
															? "1px solid var(--border-color)"
															: "none",
													padding: "2px 3px",
													cursor: "pointer",
													display: "flex",
													flexDirection: "column",
													gap: "2px",
												}}
												onMouseEnter={(e) => {
													(
														e.currentTarget as HTMLDivElement
													).style.background =
														"var(--surface-hover)";
												}}
												onMouseLeave={(e) => {
													(
														e.currentTarget as HTMLDivElement
													).style.background = "";
												}}>
												{allDayEvts.map((e) =>
													renderEventChip(e, true),
												)}
												{dueTasks.map((t) =>
													renderTaskChip(t, true),
												)}
												{hourEvents.map((e) =>
													renderEventChip(e, true),
												)}
											</div>
										);
									})}
								</div>
							))}
						</div>
					</div>
				)}
			</div>

			{/* Create / Edit modal */}
			{showModal && (
				<div className="modal-overlay">
					<div
						className="modal-content"
						style={{
							maxWidth: "600px",
							maxHeight: "90vh",
						}}>
						<div className="modal-header">
							<h3>
								{editMode
									? "Modifier l'evenement"
									: "Nouvel evenement"}
							</h3>
							<button
								className="btn-icon"
								onClick={() => setShowModal(false)}>
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
							style={{
								maxHeight: "65vh",
								overflowY: "auto",
							}}>
							{/* Title */}
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
									placeholder="Titre de l'evenement"
								/>
							</div>

							{/* Type + Priority */}
							<div
								style={{
									display: "grid",
									gridTemplateColumns: "1fr 1fr",
									gap: "1rem",
								}}>
								<div className="form-group">
									<label>Type</label>
									<div
										style={{
											position: "relative",
										}}>
										<select
											value={form.type}
											onChange={(e) =>
												setForm({
													...form,
													type: e.target
														.value as Event["type"],
												})
											}>
											<option value="meeting">
												Reunion
											</option>
											<option value="deadline">
												Echeance
											</option>
											<option value="reminder">
												Rappel
											</option>
											<option value="other">Autre</option>
										</select>
										<div
											style={{
												position: "absolute",
												left: "8px",
												top: "50%",
												transform: "translateY(-50%)",
												width: "10px",
												height: "10px",
												borderRadius: "3px",
												background:
													EVENT_COLORS[
														getFilterBucket(
															form.type,
														)
													],
												pointerEvents: "none",
											}}
										/>
									</div>
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
										<option value="normal">Normal</option>
										<option value="important">
											Important
										</option>
										<option value="urgent">Urgent</option>
									</select>
								</div>
							</div>

							{/* All day toggle */}
							<div className="form-group">
								<label
									style={{
										display: "flex",
										alignItems: "center",
										gap: "0.6rem",
										cursor: "pointer",
									}}>
									<input
										type="checkbox"
										checked={form.allDay}
										onChange={(e) =>
											setForm({
												...form,
												allDay: e.target.checked,
											})
										}
										style={{
											width: "auto",
											margin: 0,
										}}
									/>
									Journee entiere
								</label>
							</div>

							{/* Date/time grid */}
							<div
								style={{
									display: "grid",
									gridTemplateColumns: form.allDay
										? "1fr 1fr"
										: "1fr auto 1fr auto",
									gap: "0.75rem",
								}}>
								<div className="form-group">
									<label>Date de debut *</label>
									<input
										type="date"
										value={form.date}
										onChange={(e) =>
											setForm({
												...form,
												date: e.target.value,
											})
										}
									/>
								</div>
								{!form.allDay && (
									<div className="form-group">
										<label>Heure debut</label>
										<input
											type="time"
											value={form.startTime}
											onChange={(e) =>
												setForm({
													...form,
													startTime: e.target.value,
												})
											}
											style={{
												minWidth: "100px",
											}}
										/>
									</div>
								)}
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
								{!form.allDay && (
									<div className="form-group">
										<label>Heure fin</label>
										<input
											type="time"
											value={form.endTime}
											onChange={(e) =>
												setForm({
													...form,
													endTime: e.target.value,
												})
											}
											style={{
												minWidth: "100px",
											}}
										/>
									</div>
								)}
							</div>

							{/* Participants */}
							<div className="form-group">
								<label>Participants</label>
								<ParticipantSelect
									users={users}
									selected={form.participants}
									onChange={(ids) =>
										setForm({
											...form,
											participants: ids,
										})
									}
								/>
							</div>

							{/* Location + Project */}
							<div
								style={{
									display: "grid",
									gridTemplateColumns: "1fr 1fr",
									gap: "1rem",
								}}>
								<div className="form-group">
									<label>Lieu</label>
									<input
										value={form.location}
										onChange={(e) =>
											setForm({
												...form,
												location: e.target.value,
											})
										}
										placeholder="Salle, adresse, lien..."
									/>
								</div>
								<div className="form-group">
									<label>Projet lie</label>
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
												{p.emoji || ""} {p.name}
											</option>
										))}
									</select>
								</div>
							</div>

							{/* Recurrence + Reminder */}
							<div
								style={{
									display: "grid",
									gridTemplateColumns: "1fr 1fr",
									gap: "1rem",
								}}>
								<div className="form-group">
									<label>Recurrence</label>
									<select
										value={form.recurrence}
										onChange={(e) =>
											setForm({
												...form,
												recurrence: e.target.value,
											})
										}>
										{Object.entries(RECURRENCE_LABELS).map(
											([val, label]) => (
												<option key={val} value={val}>
													{label}
												</option>
											),
										)}
									</select>
								</div>
								<div className="form-group">
									<label>Rappel</label>
									<select
										value={form.reminder}
										onChange={(e) =>
											setForm({
												...form,
												reminder: e.target.value,
											})
										}>
										{REMINDER_OPTIONS.map((opt) => (
											<option
												key={opt.value}
												value={opt.value}>
												{opt.label}
											</option>
										))}
									</select>
								</div>
							</div>

							{/* Organizer */}
							<div className="form-group">
								<label>Organisateur</label>
								<select
									value={form.userId}
									onChange={(e) =>
										setForm({
											...form,
											userId: e.target.value,
										})
									}>
									{users.map((u) => (
										<option key={u.id} value={String(u.id)}>
											{u.name}
										</option>
									))}
								</select>
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
						</div>
						<div className="modal-footer">
							{editMode && (
								<button
									className="btn-secondary btn-sm"
									style={{
										color: "var(--danger)",
										marginRight: "auto",
									}}
									onClick={() => {
										setShowModal(false);
										editTarget && handleDelete(editTarget);
									}}>
									<svg
										width="12"
										height="12"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										style={{ marginRight: "4px" }}>
										<polyline points="3 6 5 6 21 6" />
										<path d="M19 6l-1 14H6L5 6" />
									</svg>
									Supprimer
								</button>
							)}
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

			{/* Event detail modal */}
			{showDetail && detailEvent && (
				<div className="modal-overlay">
					<div
						className="modal-content"
						style={{ maxWidth: "540px" }}>
						<div className="modal-header">
							<div
								style={{
									display: "flex",
									alignItems: "center",
									gap: "0.6rem",
								}}>
								<span
									className="badge"
									style={{
										background:
											EVENT_COLORS[
												getFilterBucket(
													detailEvent.type,
												)
											],
										color: "#fff",
										fontSize: "0.68rem",
										fontWeight: 600,
									}}>
									{EVENT_LABELS[
										getFilterBucket(detailEvent.type)
									] || detailEvent.type}
								</span>
								<h3 style={{ margin: 0 }}>
									{detailEvent.title}
								</h3>
							</div>
							<button
								className="btn-icon"
								onClick={() => setShowDetail(false)}>
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
							<div
								style={{
									display: "flex",
									flexDirection: "column",
									gap: "0.75rem",
								}}>
								{/* Date and time */}
								<div
									style={{
										display: "flex",
										alignItems: "center",
										gap: "0.6rem",
										fontSize: "0.85rem",
									}}>
									<svg
										width="16"
										height="16"
										viewBox="0 0 24 24"
										fill="none"
										stroke="var(--text-muted)"
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
									<div>
										<div style={{ fontWeight: 600 }}>
											{formatDateFR(detailEvent.date)}
										</div>
										{!detailEvent.allDay && (
											<div
												style={{
													fontSize: "0.8rem",
													color: "var(--text-muted)",
												}}>
												{formatTime(detailEvent.date)}
												{detailEvent.endDate &&
													` - ${formatTime(detailEvent.endDate)}`}
											</div>
										)}
										{detailEvent.allDay && (
											<div
												style={{
													fontSize: "0.78rem",
													color: "var(--text-muted)",
												}}>
												Toute la journee
												{detailEvent.endDate &&
													!sameDay(
														new Date(
															detailEvent.date,
														),
														new Date(
															detailEvent.endDate,
														),
													) &&
													` jusqu'au ${formatDateFR(detailEvent.endDate)}`}
											</div>
										)}
									</div>
								</div>

								{/* Organizer */}
								{detailEvent.userId && (
									<div
										style={{
											display: "flex",
											alignItems: "center",
											gap: "0.6rem",
											fontSize: "0.85rem",
										}}>
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
										<div>
											<div
												style={{
													fontSize: "0.72rem",
													color: "var(--text-muted)",
													fontWeight: 500,
												}}>
												Organisateur
											</div>
											<div
												style={{
													fontWeight: 600,
												}}>
												{getUserName(
													detailEvent.userId,
												)}
											</div>
										</div>
									</div>
								)}

								{/* Participants list */}
								{(() => {
									const parts = (
										detailEvent as Event & {
											participants?: number[];
										}
									).participants;
									if (!parts || parts.length === 0)
										return null;
									return (
										<div
											style={{
												display: "flex",
												alignItems: "flex-start",
												gap: "0.6rem",
												fontSize: "0.85rem",
											}}>
											<svg
												width="16"
												height="16"
												viewBox="0 0 24 24"
												fill="none"
												stroke="var(--text-muted)"
												strokeWidth="2"
												style={{
													marginTop: "2px",
												}}>
												<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
												<circle cx="9" cy="7" r="4" />
												<path d="M23 21v-2a4 4 0 0 0-3-3.87" />
												<path d="M16 3.13a4 4 0 0 1 0 7.75" />
											</svg>
											<div>
												<div
													style={{
														fontSize: "0.72rem",
														color: "var(--text-muted)",
														fontWeight: 500,
														marginBottom: "4px",
													}}>
													Participants ({parts.length}
													)
												</div>
												<div
													style={{
														display: "flex",
														flexWrap: "wrap",
														gap: "6px",
													}}>
													{parts.map((pid) => {
														const u = users.find(
															(u) => u.id === pid,
														);
														return (
															<div
																key={pid}
																style={{
																	display:
																		"flex",
																	alignItems:
																		"center",
																	gap: "5px",
																	background:
																		"var(--bg-alt)",
																	padding:
																		"3px 8px",
																	borderRadius:
																		"16px",
																	fontSize:
																		"0.76rem",
																}}>
																<div
																	style={{
																		width: "20px",
																		height: "20px",
																		borderRadius:
																			"50%",
																		background:
																			"var(--accent)",
																		color: "#fff",
																		display:
																			"flex",
																		alignItems:
																			"center",
																		justifyContent:
																			"center",
																		fontSize:
																			"0.55rem",
																		fontWeight: 700,
																		flexShrink: 0,
																	}}>
																	{u?.avatar ? (
																		<img
																			src={
																				u.avatar
																			}
																			alt={
																				u.name
																			}
																			style={{
																				width: "100%",
																				height: "100%",
																				borderRadius:
																					"50%",
																				objectFit:
																					"cover",
																			}}
																		/>
																	) : (
																		getInitials(
																			u?.name ||
																				"?",
																		)
																	)}
																</div>
																{u?.name ||
																	`#${pid}`}
															</div>
														);
													})}
												</div>
											</div>
										</div>
									);
								})()}

								{/* Linked project */}
								{detailEvent.projectId && (
									<div
										style={{
											display: "flex",
											alignItems: "center",
											gap: "0.6rem",
											fontSize: "0.85rem",
										}}>
										<svg
											width="16"
											height="16"
											viewBox="0 0 24 24"
											fill="none"
											stroke="var(--text-muted)"
											strokeWidth="2">
											<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
										</svg>
										<div>
											<div
												style={{
													fontSize: "0.72rem",
													color: "var(--text-muted)",
													fontWeight: 500,
												}}>
												Projet lie
											</div>
											<div
												style={{
													fontWeight: 600,
													color: "var(--accent)",
												}}>
												{getProjectName(
													detailEvent.projectId,
												)}
											</div>
										</div>
									</div>
								)}

								{/* Description */}
								{detailEvent.description && (
									<div
										style={{
											borderTop:
												"1px solid var(--border-color)",
											paddingTop: "0.75rem",
											marginTop: "0.25rem",
										}}>
										<div
											style={{
												fontSize: "0.72rem",
												color: "var(--text-muted)",
												fontWeight: 500,
												marginBottom: "4px",
											}}>
											Description
										</div>
										<div
											style={{
												fontSize: "0.85rem",
												lineHeight: 1.6,
												color: "var(--text)",
												whiteSpace: "pre-wrap",
											}}>
											{detailEvent.description}
										</div>
									</div>
								)}

								{/* History */}
								<div
									style={{
										borderTop:
											"1px solid var(--border-color)",
										paddingTop: "0.75rem",
										marginTop: "0.25rem",
									}}>
									<div
										style={{
											fontSize: "0.72rem",
											color: "var(--text-muted)",
											fontWeight: 500,
											marginBottom: "6px",
										}}>
										Historique
									</div>
									<div
										style={{
											display: "flex",
											flexDirection: "column",
											gap: "6px",
										}}>
										<div
											style={{
												display: "flex",
												alignItems: "center",
												gap: "8px",
												fontSize: "0.76rem",
												color: "var(--text-muted)",
											}}>
											<div
												style={{
													width: "6px",
													height: "6px",
													borderRadius: "50%",
													background:
														"var(--success)",
													flexShrink: 0,
												}}
											/>
											<span>
												Cree le{" "}
												{new Date(
													detailEvent.createdAt,
												).toLocaleDateString("fr-FR", {
													day: "numeric",
													month: "long",
													year: "numeric",
													hour: "2-digit",
													minute: "2-digit",
												})}
											</span>
										</div>
										{detailEvent.user && (
											<div
												style={{
													display: "flex",
													alignItems: "center",
													gap: "8px",
													fontSize: "0.76rem",
													color: "var(--text-muted)",
												}}>
												<div
													style={{
														width: "6px",
														height: "6px",
														borderRadius: "50%",
														background:
															"var(--accent)",
														flexShrink: 0,
													}}
												/>
												<span>
													Par {detailEvent.user.name}
												</span>
											</div>
										)}
									</div>
								</div>
							</div>
						</div>
						<div className="modal-footer">
							<button
								className="btn-secondary btn-sm"
								style={{
									color: "var(--danger)",
									marginRight: "auto",
								}}
								onClick={() => {
									setShowDetail(false);
									handleDelete(detailEvent);
								}}>
								<svg
									width="12"
									height="12"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									style={{ marginRight: "4px" }}>
									<polyline points="3 6 5 6 21 6" />
									<path d="M19 6l-1 14H6L5 6" />
								</svg>
								Supprimer
							</button>
							<button
								className="btn-secondary btn-sm"
								onClick={() => setShowDetail(false)}>
								Fermer
							</button>
							<button
								className="btn-primary btn-sm"
								onClick={() => {
									setShowDetail(false);
									openEdit(detailEvent);
								}}>
								<svg
									width="12"
									height="12"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									style={{ marginRight: "4px" }}>
									<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
									<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
								</svg>
								Modifier
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
