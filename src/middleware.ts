import { NextRequest, NextResponse } from "next/server";
import { ROLE_PAGES } from "@/lib/rbac";
import { Routes } from "@/types/constants";
import { AuthConfig } from "@/lib/config";

// Derived from Routes — single source of truth for protected app paths
const PROTECTED_PATHS = Object.values(Routes).filter((r) => r !== Routes.login);

/**
 * Determine if the request path needs auth protection
 * @param pathname - Request pathname
 * @returns True if protected
 */
function isProtectedPath(pathname: string): boolean {
	return PROTECTED_PATHS.some(
		(p) => pathname === p || pathname.startsWith(`${p}/`),
	);
}

/**
 * Decode a JWT payload without verifying the signature, and check expiry.
 * Safe for Edge Runtime — no crypto libs needed.
 * Full verification still happens in each API route handler.
 * @param token - Compact JWT string
 * @returns Decoded payload or null on malformed input or if expired
 */
function decodeJwtPayload(
	token: string,
): { userId: number; role: string } | null {
	try {
		const parts = token.split(".");
		if (parts.length !== 3) return null;
		// Normalize base64url to standard base64
		const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
		const json = atob(b64);
		const payload = JSON.parse(json);
		// Treat expired tokens as invalid to prevent redirect loops
		if (payload.exp && payload.exp * 1000 < Date.now()) return null;
		return payload;
	} catch {
		return null;
	}
}

/**
 * Resolve the short page name from a protected pathname
 * @param pathname - Request pathname like "/logs"
 * @returns Short page name like "logs"
 */
function pageFromPath(pathname: string): string {
	const match = PROTECTED_PATHS.find(
		(p) => pathname === p || pathname.startsWith(`${p}/`),
	);
	return match ? match.replace("/", "") : "";
}

/**
 * Edge-compatible middleware for auth and role-based routing
 * Does not import jwt or any Node.js-only module
 * @param request - Incoming Next.js request
 * @returns Response redirect or pass-through
 */
export function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;
	const token = request.cookies.get(AuthConfig.cookieName)?.value;

	// Redirect unauthenticated users away from protected pages
	if (isProtectedPath(pathname) && !token) {
		return NextResponse.redirect(new URL(Routes.login, request.url));
	}

	// Redirect authenticated users away from login page
	// Only redirect if the token is valid and not expired
	if (pathname === Routes.login && token) {
		const loginPayload = decodeJwtPayload(token);
		if (!loginPayload) {
			// Expired or malformed — clear stale cookie and allow login
			const res = NextResponse.next();
			res.cookies.delete(AuthConfig.cookieName);
			return res;
		}
		return NextResponse.redirect(new URL(Routes.dashboard, request.url));
	}

	// RBAC: decode token in Edge-safe way and check page access
	if (token && isProtectedPath(pathname)) {
		const payload = decodeJwtPayload(token);

		if (!payload) {
			// Malformed token — clear and redirect to login
			const res = NextResponse.redirect(
				new URL(Routes.login, request.url),
			);
			res.cookies.delete(AuthConfig.cookieName);
			return res;
		}

		const page = pageFromPath(pathname);
		const allowedPages = ROLE_PAGES[payload.role] ?? [];

		// Role not allowed on this page — redirect to dashboard
		if (page && !allowedPages.includes(page)) {
			return NextResponse.redirect(new URL("/dashboard", request.url));
		}
	}

	return NextResponse.next();
}

export const config = {
	matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
