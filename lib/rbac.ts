type Permission =
	| "view"
	| "create"
	| "edit"
	| "delete"
	| "manageUsers"
	| "viewLogs"
	| "createClient"
	| "createUser"
	| "editUser";

/**
 * Permissions per role:
 * admin   — everything
 * member  — view + create/edit products tasks projects calendar sales — NO clients create, NO logs, NO users
 * finance — view-only on their pages (clients read-only, accounting, analytics)
 * viewer  — view only
 */
const ROLE_PERMISSIONS: Record<string, Permission[]> = {
	admin: [
		"view",
		"create",
		"edit",
		"delete",
		"manageUsers",
		"viewLogs",
		"createClient",
		"createUser",
		"editUser",
	],
	member: ["view", "create", "edit", "delete"],
	viewer: ["view"],
	finance: ["view"],
};

export const ROLE_PAGES: Record<string, string[]> = {
	admin: [
		"dashboard",
		"products",
		"clients",
		"sales",
		"accounting",
		"analytics",
		"tasks",
		"projects",
		"calendar",
		"logs",
		"users",
	],
	// Members: no logs, no users page
	member: [
		"dashboard",
		"products",
		"clients",
		"sales",
		"tasks",
		"projects",
		"calendar",
	],
	viewer: [
		"dashboard",
		"products",
		"clients",
		"sales",
		"tasks",
		"projects",
		"calendar",
	],
	// Finance: read-only access to financial and client pages only
	finance: ["dashboard", "accounting", "analytics", "clients", "sales"],
};

/**
 * Matrix of fine-grained action permissions per role and resource.
 * Used by page components to conditionally render buttons and forms.
 */
export const ROLE_ACTIONS: Record<string, Record<string, boolean>> = {
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

/**
 * Check if a role has a specific permission
 * @param role - User role string
 * @param permission - Permission to check
 * @returns True if allowed
 */
export function hasPermission(role: string, permission: string): boolean {
	const perms = ROLE_PERMISSIONS[role];
	if (!perms) return false;
	return perms.includes(permission as Permission);
}

/**
 * Check if a role can access a given page
 * @param role - User role string
 * @param page - Page name to check
 * @returns True if allowed
 */
export function canAccessPage(role: string, page: string): boolean {
	const pages = ROLE_PAGES[role];
	if (!pages) return false;
	return pages.includes(page);
}

/**
 * Check if a role can perform a specific action on a resource
 * @param role - User role string
 * @param action - Action key like "createClient" or "viewLogs"
 * @returns True if allowed
 */
export function canDo(role: string, action: string): boolean {
	return ROLE_ACTIONS[role]?.[action] ?? false;
}
