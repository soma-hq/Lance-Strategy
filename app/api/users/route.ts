import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";

const USER_SELECT = {
	id: true,
	username: true,
	name: true,
	role: true,
	avatar: true,
	active: true,
	createdAt: true,
};

/**
 * List all users
 * @param request - Incoming request
 * @returns Users array without passwords
 */

export async function GET(request: NextRequest) {
	try {
		const user = await getUserFromRequest(request);
		if (!user)
			return NextResponse.json(
				{ error: "Non authentifié" },
				{ status: 401 },
			);
		if (!hasPermission(user.role, "view"))
			return NextResponse.json(
				{ error: "Permission insuffisante" },
				{ status: 403 },
			);

		const users = await prisma.user.findMany({
			orderBy: { createdAt: "desc" },
			select: USER_SELECT,
		});

		return NextResponse.json(users);
	} catch (e) {
		return NextResponse.json(
			{ error: (e as Error).message },
			{ status: 500 },
		);
	}
}

/**
 * Create a new user
 * @param request - Incoming request with user data
 * @returns Created user
 */

export async function POST(request: NextRequest) {
	try {
		const currentUser = await getUserFromRequest(request);
		if (!currentUser)
			return NextResponse.json(
				{ error: "Non authentifié" },
				{ status: 401 },
			);
		if (!hasPermission(currentUser.role, "manageUsers"))
			return NextResponse.json(
				{ error: "Permission insuffisante" },
				{ status: 403 },
			);

		const { username, password, name, role, avatar, active } =
			await request.json();

		if (!username || !password || !name) {
			return NextResponse.json(
				{ error: "Champs requis : username, password, name" },
				{ status: 400 },
			);
		}

		// Check for duplicate username
		const existing = await prisma.user.findUnique({
			where: { username: username.toLowerCase() },
		});
		if (existing)
			return NextResponse.json(
				{ error: "Ce nom d'utilisateur existe déjà" },
				{ status: 400 },
			);

		const hashed = await bcrypt.hash(password, 10);

		const newUser = await prisma.user.create({
			data: {
				username: username.toLowerCase(),
				password: hashed,
				name,
				role: role || "member",
				avatar: avatar || name.charAt(0).toUpperCase(),
				active: active !== undefined ? active : true,
			},
			select: USER_SELECT,
		});

		await prisma.log.create({
			data: {
				action: "Création utilisateur",
				details: `Utilisateur "${name}" créé`,
				userId: currentUser.id,
				userName: currentUser.name,
				module: "users",
			},
		});

		return NextResponse.json(newUser, { status: 201 });
	} catch (e) {
		return NextResponse.json(
			{ error: (e as Error).message },
			{ status: 500 },
		);
	}
}
