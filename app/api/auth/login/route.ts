import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

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

	// 10 attempts per minute per IP
	if (!rateLimit(`login:${ip}`, 10, 60_000)) {
		return NextResponse.json(
			{ error: "Trop de tentatives. Réessayez dans une minute." },
			{ status: 429 },
		);
	}

	try {
		const body = await request.json();
		const parsed = loginSchema.safeParse(body);

		if (!parsed.success) {
			return NextResponse.json(
				{ error: "Identifiants invalides" },
				{ status: 400 },
			);
		}

		const { username, password } = parsed.data;

		const user = await prisma.user.findUnique({
			where: { username: username.toLowerCase() },
		});

		if (!user || !user.active) {
			return NextResponse.json(
				{ error: "Identifiants incorrects" },
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
				{ error: "Identifiants incorrects" },
				{ status: 401 },
			);
		}

		const token = signToken({ userId: user.id, role: user.role });

		await prisma.log.create({
			data: {
				action: "Connexion",
				details: `${user.name} connecté`,
				userId: user.id,
				userName: user.name,
				module: "auth",
			},
		});

		const { password: _, ...userWithoutPassword } = user;

		const response = NextResponse.json({ user: userWithoutPassword });
		response.cookies.set("token", token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			maxAge: 60 * 60 * 24 * 7,
			path: "/",
		});

		return response;
	} catch (e) {
		console.error("[auth/login]", e);
		return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
	}
}
