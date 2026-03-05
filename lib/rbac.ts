type Permission =
	| "view"
	| "create"
	| "edit"
	| "delete"
	| "manageUsers"
	| "viewLogs";

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
	admin: ["view", "create", "edit", "delete", "manageUsers", "viewLogs"],
	member: ["view", "create", "edit"],
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
	finance: ["dashboard", "sales", "clients", "accounting", "analytics"],
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
