import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { AuthConfig, RateLimitsConfig } from "@/lib/config";
import { LogActions, LogModules, ErrorMessages } from "@/types/constants";

const loginSchema = z.object({
	username: z.string().min(1).max(50),
	password: z.string().min(1).max(200),
});

/**
 * Handle user login and set auth cookie.
 * Rate-limited to 10 attempts per minute per IP.
 * @param request - Incoming request with username/password
 * @returns User data or error
 */
export async function POST(request: NextRequest) {
	const ip = getClientIp(request);

	// Rate limit by IP
	if (
		!rateLimit(
			`login:${ip}`,
			RateLimitsConfig.login.maxAttempts,
			RateLimitsConfig.login.windowMs,
		)
	) {
		return NextResponse.json(
			{ error: ErrorMessages.tooManyRequests },
			{ status: 429 },
		);
	}

	try {
		const body = await request.json();
		const parsed = loginSchema.safeParse(body);

		if (!parsed.success) {
			return NextResponse.json(
				{ error: ErrorMessages.invalidInput },
				{ status: 400 },
			);
		}

		const { username, password } = parsed.data;

		const user = await prisma.user.findUnique({
			where: { username: username.toLowerCase() },
		});

		if (!user || !user.active) {
			return NextResponse.json(
				{ error: ErrorMessages.invalidCredentials },
				{ status: 401 },
			);
		}

		// Support bcrypt and plain text passwords
		let passwordMatch = false;
		if (user.password.startsWith("$2")) {
			passwordMatch = await bcrypt.compare(password, user.password);
		} else {
			passwordMatch = user.password === password;
		}

		if (!passwordMatch) {
			return NextResponse.json(
				{ error: ErrorMessages.invalidCredentials },
				{ status: 401 },
			);
		}

		const token = signToken({ userId: user.id, role: user.role });

		await prisma.log.create({
			data: {
				action: LogActions.login,
				details: `${user.name} connecté`,
				userId: user.id,
				userName: user.name,
				module: LogModules.auth,
			},
		});

		const { password: _, ...userWithoutPassword } = user;

		const response = NextResponse.json({ user: userWithoutPassword });
		response.cookies.set(AuthConfig.cookieName, token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: AuthConfig.cookieSameSite,
			maxAge: AuthConfig.cookieMaxAgeSec,
			path: "/",
		});

		return response;
	} catch (e) {
		console.error("[auth/login]", e);
		return NextResponse.json(
			{ error: ErrorMessages.serverError },
			{ status: 500 },
		);
	}
}
