import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import type { User } from "@prisma/client";

export type RouteContext = { params: Promise<Record<string, string>> };
export type AuthHandler = (
	req: NextRequest,
	user: User,
	ctx: RouteContext,
) => Promise<NextResponse>;

/**
 * Wrap an authenticated route handler with auth, permission, and error handling.
 * Eliminates the repeated try/catch + auth boilerplate in every route.
 *
 * @param permission - Required RBAC permission string (e.g. "view", "create")
 * @param fn - The actual handler receiving (request, user, routeContext)
 * @returns Next.js compatible route handler
 */
export function withAuth(permission: string, fn: AuthHandler) {
	return async (
		req: NextRequest,
		ctx: RouteContext,
	): Promise<NextResponse> => {
		try {
			const user = await getUserFromRequest(req);
			if (!user)
				return NextResponse.json(
					{ error: "Non authentifié" },
					{ status: 401 },
				);
			if (!hasPermission(user.role, permission))
				return NextResponse.json(
					{ error: "Permission insuffisante" },
					{ status: 403 },
				);
			return await fn(req, user, ctx);
		} catch (e) {
			console.error(`[${req.method} ${req.nextUrl.pathname}]`, e);
			return NextResponse.json(
				{ error: (e as Error).message },
				{ status: 500 },
			);
		}
	};
}
