import { NextRequest, NextResponse } from "next/server";

const PROTECTED_PATHS = [
	"/dashboard",
	"/products",
	"/clients",
	"/sales",
	"/accounting",
	"/analytics",
	"/tasks",
	"/projects",
	"/calendar",
	"/logs",
	"/users",
];

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
 * Next.js middleware for authentication-based routing
 * @param request - Incoming request
 * @returns Response or redirect
 */

export function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;
	const token = request.cookies.get("token")?.value;

	// Protected route without token
	if (isProtectedPath(pathname) && !token) {
		return NextResponse.redirect(new URL("/login", request.url));
	}

	// Login page with valid token
	if (pathname === "/login" && token) {
		return NextResponse.redirect(new URL("/dashboard", request.url));
	}

	return NextResponse.next();
}

export const config = {
	matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
