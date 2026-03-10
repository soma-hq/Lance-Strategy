import {
	Permissions,
	RolePermissions,
	RoleActions,
	RolePages as RolePagesConst,
	type Permission,
	type UserRole,
} from "@/types/constants";

// Re-export from constants for middleware and route guard usage
export const ROLE_PAGES: Record<string, string[]> = RolePagesConst as Record<
	string,
	string[]
>;

// Re-export from constants for page-level action checks
export const ROLE_ACTIONS: Record<
	string,
	Record<string, boolean>
> = RoleActions;

/**
 * Check if a role has a specific permission
 * @param role - User role string
 * @param permission - Permission to check
 * @returns True if allowed
 */
export function hasPermission(role: string, permission: string): boolean {
	const perms = RolePermissions[role as UserRole];
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
