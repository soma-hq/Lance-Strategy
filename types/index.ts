export type UserRole = "admin" | "member" | "viewer" | "finance";

export type SaleStatus = "completed" | "cancelled" | "postponed";

export type TaskStatus =
	| "en_cours"
	| "bloquee"
	| "realisee"
	| "annulee"
	| "en_attente";

export type TaskPriority = "high" | "medium" | "low";

export type ProjectStatus = "active" | "paused" | "completed" | "cancelled";

export type ProjectPriority = "high" | "medium" | "low";

export type ClientStatus = "one-shot" | "récurrent" | "permanent" | "inactif";

export type StockHistoryType = "entry" | "exit" | "set";

export type EventType =
	| "meeting"
	| "call_urgent"
	| "call"
	| "reminder"
	| "personal"
	| "deadline"
	| "other";

export interface User {
	id: number;
	username: string;
	name: string;
	role: UserRole;
	avatar: string | null;
	active: boolean;
	createdAt: Date | string;
}

export interface Product {
	id: number;
	name: string;
	description: string | null;
	price: number;
	priceHT: number;
	sku: string | null;
	category: string | null;
	alertThreshold: number;
	createdAt: Date | string;
	stocks?: UserStock[];
	stockHistory?: StockHistory[];
}

export interface UserStock {
	id: number;
	productId: number;
	username: string;
	quantity: number;
}

export interface StockHistory {
	id: number;
	productId: number;
	date: Date | string;
	type: StockHistoryType;
	quantity: number;
	stockBefore: number;
	stockAfter: number;
	userId: number | null;
	reason: string | null;
	reference: string | null;
	user?: Pick<User, "id" | "name" | "avatar">;
}

export interface Client {
	id: number;
	name: string;
	email: string | null;
	phone: string | null;
	company: string | null;
	status: ClientStatus;
	notes: string | null;
	createdAt: Date | string;
	sales?: Sale[];
}

export interface Sale {
	id: number;
	productId: number;
	clientId: number | null;
	sellerId: number;
	quantity: number;
	unitPriceTTC: number;
	unitPriceHT: number;
	totalTTC: number;
	totalHT: number;
	status: SaleStatus;
	platform: string;
	date: Date | string;
	createdAt: Date | string;
	product?: Pick<Product, "id" | "name">;
	client?: Pick<Client, "id" | "name"> | null;
	seller?: Pick<User, "id" | "name" | "username">;
}

export interface Task {
	id: number;
	title: string;
	description: string | null;
	dueDate: Date | string | null;
	status: TaskStatus;
	completed: boolean;
	cancelled: boolean;
	priority: TaskPriority;
	assigneeId: number | null;
	projectId: number | null;
	createdAt: Date | string;
	assignee?: Pick<User, "id" | "name" | "avatar"> | null;
	project?: Pick<Project, "id" | "name" | "emoji"> | null;
	comments?: TaskComment[];
}

export interface TaskComment {
	id: number;
	taskId: number;
	userId: number;
	content: string;
	createdAt: Date | string;
	user?: Pick<User, "id" | "name" | "avatar">;
}

export interface Project {
	id: number;
	name: string;
	description: string | null;
	status: ProjectStatus;
	priority: ProjectPriority;
	emoji: string | null;
	createdAt: Date | string;
	members?: number[];
	membersData?: Pick<User, "id" | "name" | "avatar" | "username">[];
	taskCount?: number;
	completedTaskCount?: number;
	tasks?: Pick<Task, "id" | "status" | "completed">[];
}

export interface Log {
	id: number;
	action: string;
	details: string | null;
	userId: number | null;
	userName: string | null;
	timestamp: Date | string;
	module: string | null;
	user?: Pick<User, "id" | "name" | "avatar"> | null;
}

export interface Event {
	id: number;
	title: string;
	description: string | null;
	date: Date | string;
	endDate: Date | string | null;
	type: EventType;
	color: string | null;
	userId: number;
	projectId: number | null;
	allDay: boolean;
	createdAt: Date | string;
	user?: Pick<User, "id" | "name">;
}

export interface DashboardData {
	revenue: {
		today: number;
		week: number;
		month: number;
		total: number;
	};
	sales: {
		today: number;
		week: number;
		month: number;
		total: number;
		cancelled: number;
		recent: Sale[];
	};
	tasks: {
		active: number;
		completed: number;
		overdue: number;
		overdueList: Task[];
	};
	clients: {
		total: number;
		newThisMonth: number;
	};
	products: {
		total: number;
		criticalStock: number;
		criticalList: {
			id: number;
			name: string;
			totalStock: number;
			alertThreshold: number;
		}[];
	};
	projects: {
		active: number;
		completed: number;
		total: number;
	};
	charts: {
		dailyRevenue: {
			date: string;
			label: string;
			revenue: number;
			count: number;
		}[];
		topProducts: { name: string; revenue: number }[];
	};
	recentLogs: Log[];
	upcomingEvents: Event[];
}

export interface ApiError {
	error: string;
	status?: number;
}
