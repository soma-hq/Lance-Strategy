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
 * Get a single user by ID
 * @param request - Incoming request
 * @param params - Route params with id
 * @returns User object
 */

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const currentUser = await getUserFromRequest(request);
		if (!currentUser)
			return NextResponse.json(
				{ error: "Non authentifié" },
				{ status: 401 },
			);
		if (!hasPermission(currentUser.role, "view"))
			return NextResponse.json(
				{ error: "Permission insuffisante" },
				{ status: 403 },
			);

		const { id } = await params;
		const user = await prisma.user.findUnique({
			where: { id: parseInt(id) },
			select: USER_SELECT,
		});

		if (!user)
			return NextResponse.json(
				{ error: "Utilisateur introuvable" },
				{ status: 404 },
			);

		return NextResponse.json(user);
	} catch (e) {
		return NextResponse.json(
			{ error: (e as Error).message },
			{ status: 500 },
		);
	}
}

/**
 * Update a user by ID
 * @param request - Incoming request with update data
 * @param params - Route params with id
 * @returns Updated user
 */

export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
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

		const { id } = await params;
		const { username, password, name, role, avatar, active } =
			await request.json();

		const data: Record<string, unknown> = {};
		if (username) data.username = username.toLowerCase();
		if (name) data.name = name;
		if (role) data.role = role;
		if (avatar !== undefined) data.avatar = avatar;
		if (active !== undefined) data.active = active;
		if (password) data.password = await bcrypt.hash(password, 10);

		const user = await prisma.user.update({
			where: { id: parseInt(id) },
			data,
			select: USER_SELECT,
		});

		await prisma.log.create({
			data: {
				action: "Modification utilisateur",
				details: `Utilisateur "${user.name}" modifié`,
				userId: currentUser.id,
				userName: currentUser.name,
				module: "users",
			},
		});

		return NextResponse.json(user);
	} catch (e) {
		return NextResponse.json(
			{ error: (e as Error).message },
			{ status: 500 },
		);
	}
}

/**
 * Delete a user by ID
 * @param request - Incoming request
 * @param params - Route params with id
 * @returns Success message
 */

export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
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

		const { id } = await params;
		const userId = parseInt(id);

		// Prevent self-deletion
		if (userId === currentUser.id) {
			return NextResponse.json(
				{ error: "Impossible de supprimer ton propre compte" },
				{ status: 400 },
			);
		}

		const user = await prisma.user.findUnique({ where: { id: userId } });
		if (!user)
			return NextResponse.json(
				{ error: "Utilisateur introuvable" },
				{ status: 404 },
			);

		await prisma.user.delete({ where: { id: userId } });

		await prisma.log.create({
			data: {
				action: "Suppression utilisateur",
				details: `Utilisateur "${user.name}" supprimé`,
				userId: currentUser.id,
				userName: currentUser.name,
				module: "users",
			},
		});

		return NextResponse.json({ message: "Utilisateur supprimé" });
	} catch (e) {
		return NextResponse.json(
			{ error: (e as Error).message },
			{ status: 500 },
		);
	}
}
