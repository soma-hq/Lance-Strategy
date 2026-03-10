// Available user roles in the application
export const UserRoles = {
	Admin: "admin",
	Member: "member",
	Viewer: "viewer",
	Finance: "finance",
} as const;

export type UserRole = (typeof UserRoles)[keyof typeof UserRoles];

// Display labels for each user role
export const UserRoleLabels = {
	admin: "Administrateur",
	member: "Membre",
	viewer: "Observateur",
	finance: "Finance",
} as Record<string, string>;

// Sale lifecycle statuses
export const SaleStatuses = {
	Completed: "completed",
	Cancelled: "cancelled",
	Postponed: "postponed",
} as const;

export type SaleStatus = (typeof SaleStatuses)[keyof typeof SaleStatuses];

// Display labels for sale statuses
export const SaleStatusLabels = {
	completed: "Complétée",
	cancelled: "Annulée",
	postponed: "Reportée",
} as Record<string, string>;

// Task lifecycle statuses
export const TaskStatuses = {
	InProgress: "en_cours",
	Blocked: "bloquee",
	Done: "realisee",
	Cancelled: "annulee",
	Pending: "en_attente",
} as const;

export type TaskStatus = (typeof TaskStatuses)[keyof typeof TaskStatuses];

// Display labels for task statuses
export const TaskStatusLabels = {
	en_cours: "En cours",
	bloquee: "Bloquée",
	realisee: "Réalisée",
	annulee: "Annulée",
	en_attente: "En attente",
} as Record<string, string>;

// Priority levels shared by tasks and projects
export const Priorities = {
	High: "high",
	Medium: "medium",
	Low: "low",
} as const;

export type Priority = (typeof Priorities)[keyof typeof Priorities];

// Display labels for priority levels
export const PriorityLabels = {
	high: "Haute",
	medium: "Moyenne",
	low: "Basse",
} as Record<string, string>;

// Project lifecycle statuses
export const ProjectStatuses = {
	Active: "active",
	Paused: "paused",
	Completed: "completed",
	Cancelled: "cancelled",
} as const;

export type ProjectStatus =
	(typeof ProjectStatuses)[keyof typeof ProjectStatuses];

// Display labels for project statuses
export const ProjectStatusLabels = {
	active: "Actif",
	paused: "En pause",
	completed: "Terminé",
	cancelled: "Annulé",
} as Record<string, string>;

// Client relationship statuses
export const ClientStatuses = {
	OneShot: "one-shot",
	Recurrent: "récurrent",
	Permanent: "permanent",
	Inactive: "inactif",
} as const;

export type ClientStatus = (typeof ClientStatuses)[keyof typeof ClientStatuses];

// Display labels for client statuses
export const ClientStatusLabels = {
	"one-shot": "One-shot",
	récurrent: "Récurrent",
	permanent: "Permanent",
	inactif: "Inactif",
} as Record<string, string>;

// Stock movement operation types
export const StockHistoryTypes = {
	Entry: "entry",
	Exit: "exit",
	Set: "set",
} as const;

export type StockHistoryType =
	(typeof StockHistoryTypes)[keyof typeof StockHistoryTypes];

// Display labels for stock operations
export const StockHistoryTypeLabels = {
	entry: "Entrée",
	exit: "Sortie",
	set: "Ajustement",
} as Record<string, string>;

// Calendar event categories
export const EventTypes = {
	Meeting: "meeting",
	CallUrgent: "call_urgent",
	Call: "call",
	Reminder: "reminder",
	Personal: "personal",
	Deadline: "deadline",
	Other: "other",
} as const;

export type EventType = (typeof EventTypes)[keyof typeof EventTypes];

// Display labels for event types
export const EventTypeLabels = {
	meeting: "Réunion",
	call_urgent: "Appel urgent",
	call: "Appel",
	reminder: "Rappel",
	personal: "Personnel",
	deadline: "Échéance",
	other: "Autre",
} as Record<string, string>;

// Default color codes associated with each event type
export const EventTypeColors = {
	meeting: "#4f8ef7",
	call_urgent: "#ef4444",
	call: "#22c55e",
	reminder: "#f59e0b",
	personal: "#a855f7",
	deadline: "#f97316",
	other: "#6b7280",
} as Record<string, string>;

// Application module/page identifiers
export const Modules = {
	Dashboard: "dashboard",
	Products: "products",
	Clients: "clients",
	Sales: "sales",
	Accounting: "accounting",
	Analytics: "analytics",
	Tasks: "tasks",
	Projects: "projects",
	Calendar: "calendar",
	Logs: "logs",
	Users: "users",
} as const;

export type Module = (typeof Modules)[keyof typeof Modules];

// Display labels for each module
export const ModuleLabels = {
	dashboard: "Tableau de bord",
	products: "Produits",
	clients: "Clients",
	sales: "Ventes",
	accounting: "Comptabilité",
	analytics: "Analytiques",
	tasks: "Tâches",
	projects: "Projets",
	calendar: "Calendrier",
	logs: "Journaux",
	users: "Utilisateurs",
} as Record<string, string>;

// Fine-grained RBAC permission keys
export const Permissions = {
	View: "view",
	Create: "create",
	Edit: "edit",
	Delete: "delete",
	ManageUsers: "manageUsers",
	ViewLogs: "viewLogs",
	CreateClient: "createClient",
	CreateUser: "createUser",
	EditUser: "editUser",
} as const;

export type Permission = (typeof Permissions)[keyof typeof Permissions];

// Pages accessible per role
export const RolePages: Record<UserRole, Module[]> = {
	admin: [
		Modules.Dashboard,
		Modules.Products,
		Modules.Clients,
		Modules.Sales,
		Modules.Accounting,
		Modules.Analytics,
		Modules.Tasks,
		Modules.Projects,
		Modules.Calendar,
		Modules.Logs,
		Modules.Users,
	],
	member: [
		Modules.Dashboard,
		Modules.Products,
		Modules.Clients,
		Modules.Sales,
		Modules.Tasks,
		Modules.Projects,
		Modules.Calendar,
	],
	viewer: [
		Modules.Dashboard,
		Modules.Products,
		Modules.Clients,
		Modules.Sales,
		Modules.Tasks,
		Modules.Projects,
		Modules.Calendar,
	],
	finance: [
		Modules.Dashboard,
		Modules.Accounting,
		Modules.Analytics,
		Modules.Clients,
		Modules.Sales,
	],
};

// Permissions granted to each role
export const RolePermissions: Record<UserRole, Permission[]> = {
	admin: [
		Permissions.View,
		Permissions.Create,
		Permissions.Edit,
		Permissions.Delete,
		Permissions.ManageUsers,
		Permissions.ViewLogs,
		Permissions.CreateClient,
		Permissions.CreateUser,
		Permissions.EditUser,
	],
	member: [
		Permissions.View,
		Permissions.Create,
		Permissions.Edit,
		Permissions.Delete,
	],
	viewer: [Permissions.View],
	finance: [Permissions.View],
};

// Fine-grained action capability matrix per role
export const RoleActions: Record<UserRole, Record<string, boolean>> = {
	admin: {
		createClient: true,
		editClient: true,
		deleteClient: true,
		createSale: true,
		editSale: true,
		deleteSale: true,
		createUser: true,
		editUser: true,
		deleteUser: true,
		viewLogs: true,
		createProduct: true,
		editProduct: true,
		deleteProduct: true,
		createTask: true,
		editTask: true,
		deleteTask: true,
		createProject: true,
		editProject: true,
		deleteProject: true,
		createEvent: true,
		editEvent: true,
		deleteEvent: true,
	},
	member: {
		createClient: false,
		editClient: false,
		deleteClient: false,
		createSale: true,
		editSale: true,
		deleteSale: false,
		createUser: false,
		editUser: false,
		deleteUser: false,
		viewLogs: false,
		createProduct: true,
		editProduct: true,
		deleteProduct: false,
		createTask: true,
		editTask: true,
		deleteTask: true,
		createProject: true,
		editProject: true,
		deleteProject: false,
		createEvent: true,
		editEvent: true,
		deleteEvent: true,
	},
	finance: {
		createClient: false,
		editClient: false,
		deleteClient: false,
		createSale: false,
		editSale: false,
		deleteSale: false,
		createUser: false,
		editUser: false,
		deleteUser: false,
		viewLogs: false,
		createProduct: false,
		editProduct: false,
		deleteProduct: false,
		createTask: false,
		editTask: false,
		deleteTask: false,
		createProject: false,
		editProject: false,
		deleteProject: false,
		createEvent: false,
		editEvent: false,
		deleteEvent: false,
	},
	viewer: {
		createClient: false,
		editClient: false,
		deleteClient: false,
		createSale: false,
		editSale: false,
		deleteSale: false,
		createUser: false,
		editUser: false,
		deleteUser: false,
		viewLogs: false,
		createProduct: false,
		editProduct: false,
		deleteProduct: false,
		createTask: false,
		editTask: false,
		deleteTask: false,
		createProject: false,
		editProject: false,
		deleteProject: false,
		createEvent: false,
		editEvent: false,
		deleteEvent: false,
	},
};

// Authentication cookie names (obfuscated for security)
export const CookieKeys = {
	token: "_ls4t",
} as const;

// Full month names for date formatting (French)
export const MonthNames = [
	"Janvier",
	"Février",
	"Mars",
	"Avril",
	"Mai",
	"Juin",
	"Juillet",
	"Août",
	"Septembre",
	"Octobre",
	"Novembre",
	"Décembre",
] as readonly string[];

// Short month names for compact date display
export const MonthNamesShort = [
	"Jan",
	"Fév",
	"Mar",
	"Avr",
	"Mai",
	"Jun",
	"Jul",
	"Aoû",
	"Sep",
	"Oct",
	"Nov",
	"Déc",
] as readonly string[];

// Full day names for calendar display (French, starting Monday)
export const DayNames = [
	"Lundi",
	"Mardi",
	"Mercredi",
	"Jeudi",
	"Vendredi",
	"Samedi",
	"Dimanche",
] as readonly string[];

// Short day names starting Sunday (index 0 = Sunday) — used for heatmaps and analytics
export const DayNamesShort = [
	"Dim",
	"Lun",
	"Mar",
	"Mer",
	"Jeu",
	"Ven",
	"Sam",
] as readonly string[];

// Full day names starting Sunday (index 0 = Sunday) — used for analytics labels
export const DayNamesFull = [
	"Dimanche",
	"Lundi",
	"Mardi",
	"Mercredi",
	"Jeudi",
	"Vendredi",
	"Samedi",
] as readonly string[];

// Sale platforms available for selection
export const SalePlatforms = [
	"",
	"Direct",
	"Amazon",
	"Cdiscount",
	"Etsy",
	"eBay",
	"Autre",
] as readonly string[];

// CSS badge class per task status
export const TaskStatusBadges = {
	en_attente: "badge-light",
	en_cours: "badge-primary",
	realisee: "badge-success",
	bloquee: "badge-danger",
	annulee: "badge-light",
} as Record<string, string>;

// CSS badge class per priority level
export const PriorityBadges = {
	low: "badge-light",
	medium: "badge-warning",
	high: "badge-danger",
} as Record<string, string>;

// CSS badge class per project status
export const ProjectStatusBadges = {
	active: "badge-primary",
	paused: "badge-warning",
	completed: "badge-success",
	cancelled: "badge-light",
} as Record<string, string>;

// CSS badge class per sale status
export const SaleStatusBadges = {
	completed: "badge-success",
	cancelled: "badge-danger",
	postponed: "badge-warning",
} as Record<string, string>;

// CSS badge class per client status
export const ClientStatusBadges = {
	"one-shot": "badge-warning",
	récurrent: "badge-success",
	permanent: "badge-success",
	inactif: "badge-danger",
} as Record<string, string>;

// CSS badge class per event type
export const EventTypeBadges = {
	meeting: "badge-primary",
	call_urgent: "badge-danger",
	call: "badge-warning",
	reminder: "badge-light",
	personal: "badge-light",
	deadline: "badge-danger",
	other: "badge-light",
} as Record<string, string>;

// CSS badge class per module
export const ModuleBadges = {
	auth: "badge-primary",
	products: "badge-warning",
	sales: "badge-success",
	users: "badge-danger",
	clients: "badge-info",
	tasks: "badge-primary",
	projects: "badge-warning",
	calendar: "badge-light",
	logs: "badge-light",
} as Record<string, string>;

// Hex/CSS-variable colors per task status — used in kanban columns and chart segments
export const TaskStatusColors = {
	en_attente: "#95a5a6",
	en_cours: "var(--accent)",
	realisee: "var(--success)",
	bloquee: "var(--danger)",
	annulee: "#95a5a6",
} as Record<string, string>;

// Colors per project status — used in analytics donut charts
export const ProjectStatusColors = {
	active: "var(--success)",
	paused: "var(--warning)",
	completed: "var(--accent)",
	cancelled: "var(--danger)",
} as Record<string, string>;

// Colors per client status — used in analytics donut charts
export const ClientStatusColors = {
	"one-shot": "#8b5cf6",
	récurrent: "var(--accent)",
	permanent: "var(--success)",
	inactif: "#6b7280",
} as Record<string, string>;

// Colors per sale status — used in analytics donut charts
export const SaleStatusColors = {
	completed: "var(--success)",
	postponed: "var(--warning)",
	cancelled: "var(--danger)",
} as Record<string, string>;

// Ordered kanban columns with display color per task status
export const KanbanColumns: { key: string; label: string; color: string }[] = [
	{ key: TaskStatuses.Pending, label: "À faire", color: "#95a5a6" },
	{ key: TaskStatuses.InProgress, label: "En cours", color: "var(--accent)" },
	{ key: TaskStatuses.Blocked, label: "Bloquée", color: "var(--danger)" },
	{ key: TaskStatuses.Done, label: "Réalisée", color: "var(--success)" },
];

// Human-readable labels per recurrence value
export const RecurrenceLabels: Record<string, string> = {
	none: "Aucune",
	daily: "Quotidienne",
	weekly: "Hebdomadaire",
	monthly: "Mensuelle",
};

// Reminder offset options for events
export const ReminderOptions: { value: string; label: string }[] = [
	{ value: "none", label: "Aucun" },
	{ value: "5min", label: "5 minutes avant" },
	{ value: "15min", label: "15 minutes avant" },
	{ value: "30min", label: "30 minutes avant" },
	{ value: "1h", label: "1 heure avant" },
	{ value: "1d", label: "1 jour avant" },
];

// Dashboard chart colors per module
export const ModuleColors: Record<string, string> = {
	sales: "var(--success)",
	clients: "#2e4a8a",
	products: "var(--warning)",
	tasks: "#6366f1",
	projects: "#8b5cf6",
	events: "#e74c3c",
	auth: "var(--text-muted)",
};

// Palette of project accent colors
export const ProjectColors: readonly string[] = [
	"#2e4a8a",
	"#b8923a",
	"#27ae60",
	"#e74c3c",
	"#8e44ad",
	"#2980b9",
	"#d35400",
	"#16a085",
	"#c0392b",
	"#34495e",
] as const;

// Default values used when creating new entities
export const DefaultValues = {
	sale: { status: "completed", platform: "vente_locale" },
	task: { status: "en_cours", priority: "medium" },
	client: { status: "one-shot" },
	project: { status: "active", priority: "medium", emoji: "📁" },
	event: { type: "reminder", color: "#2e4a8a" },
	product: { alertThreshold: 10 },
	user: { avatar: "?", role: "member" },
} as const;

// Standardised error messages returned by the API
export const ErrorMessages = {
	unauthorized: "Non authentifié",
	forbidden: "Permission insuffisante",
	tooManyRequests: "Trop de tentatives. Réessayez dans une minute.",
	invalidCredentials: "Identifiants incorrects",
	serverError: "Erreur serveur",
	notFound: "Ressource introuvable",
	invalidInput: "Données invalides",
} as const;

// Log module identifiers
export const LogModules = {
	auth: "auth",
	clients: "clients",
	sales: "sales",
	products: "products",
	tasks: "tasks",
	projects: "projects",
	users: "users",
	calendar: "calendar",
} as const;

// Log action labels used when writing audit entries
export const LogActions = {
	login: "Connexion",
	logout: "Déconnexion",
	createClient: "Création client",
	updateClient: "Modification client",
	deleteClient: "Suppression client",
	createSale: "Création vente",
	updateSale: "Modification vente",
	deleteSale: "Suppression vente",
	createProduct: "Création produit",
	updateProduct: "Modification produit",
	deleteProduct: "Suppression produit",
	createTask: "Création tâche",
	updateTask: "Modification tâche",
	deleteTask: "Suppression tâche",
	createProject: "Création projet",
	updateProject: "Modification projet",
	deleteProject: "Suppression projet",
	createEvent: "Création événement",
	updateEvent: "Modification événement",
	deleteEvent: "Suppression événement",
	createUser: "Création utilisateur",
	updateUser: "Modification utilisateur",
	deleteUser: "Suppression utilisateur",
} as const;

// Hour boundaries used for greeting logic on the dashboard
export const GreetingThresholds = {
	night: 7,
	morning: 12,
	afternoon: 18,
} as const;

// Greeting messages keyed by time-of-day segment
export const GreetingMessages: Record<string, string> = {
	night: "Bonne nuit",
	morning: "Bonjour",
	afternoon: "Bon après-midi",
	evening: "Bonne soirée",
};

// Application route paths
export const Routes = {
	login: "/login",
	dashboard: "/dashboard",
	products: "/products",
	clients: "/clients",
	sales: "/sales",
	accounting: "/accounting",
	analytics: "/analytics",
	tasks: "/tasks",
	projects: "/projects",
	calendar: "/calendar",
	logs: "/logs",
	users: "/users",
} as const;
