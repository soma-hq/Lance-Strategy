import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuthConfig } from "@/lib/config";

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";

interface TokenPayload {
	userId: number;
	role: string;
}

/**
 * Sign a JWT token for the given payload
 * @param payload - Data to encode in the token
 * @returns Signed JWT string
 */

export function signToken(payload: TokenPayload): string {
	return jwt.sign(payload, JWT_SECRET, {
		expiresIn: AuthConfig.tokenExpiresIn as jwt.SignOptions["expiresIn"],
	});
}

/**
 * Verify and decode a JWT token
 * @param token - JWT string to verify
 * @returns Decoded payload or null if invalid
 */

export function verifyToken(token: string): TokenPayload | null {
	try {
		return jwt.verify(token, JWT_SECRET) as TokenPayload;
	} catch {
		return null;
	}
}

/**
 * Extract the JWT token string from a request
 * @param request - Incoming Next.js request
 * @returns Token string or null if not present
 */

export function getTokenFromRequest(request: NextRequest): string | null {
	// Check cookie first
	const cookie = request.cookies.get(AuthConfig.cookieName);
	if (cookie?.value) return cookie.value;

	// Fall back to Authorization header
	const authHeader = request.headers.get("Authorization");
	if (authHeader?.startsWith(AuthConfig.bearerPrefix)) {
		return authHeader.slice(AuthConfig.bearerPrefix.length);
	}

	return null;
}

/**
 * Get the authenticated user from a request
 * @param request - Incoming Next.js request
 * @returns Full user object or null if unauthenticated
 */

export async function getUserFromRequest(request: NextRequest) {
	const token = getTokenFromRequest(request);
	if (!token) return null;

	const payload = verifyToken(token);
	if (!payload) return null;

	// Fetch user from DB
	const user = await prisma.user.findUnique({
		where: { id: payload.userId },
	});

	if (!user || !user.active) return null;

	return user;
}
