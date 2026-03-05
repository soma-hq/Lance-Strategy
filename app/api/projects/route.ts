import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";

const MEMBERS_INCLUDE = {
	include: {
		user: {
			select: { id: true, name: true, username: true, avatar: true },
		},
	},
};

/**
 * List all projects with members and task counts
 * @param request - Incoming request
 * @returns Projects array with computed fields
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

		const projects = await prisma.project.findMany({
			include: {
				members: MEMBERS_INCLUDE,
				tasks: { select: { id: true, status: true, completed: true } },
			},
			orderBy: { createdAt: "desc" },
		});

		const result = projects.map((p) => ({
			...p,
			members: p.members.map((m) => m.user.id),
			membersData: p.members.map((m) => m.user),
			taskCount: p.tasks.length,
			completedTaskCount: p.tasks.filter(
				(t) => t.completed || t.status === "realisee",
			).length,
		}));

		return NextResponse.json(result);
	} catch (e) {
		return NextResponse.json(
			{ error: (e as Error).message },
			{ status: 500 },
		);
	}
}

/**
 * Create a new project with optional members
 * @param request - Incoming request with project data
 * @returns Created project
 */

export async function POST(request: NextRequest) {
	try {
		const currentUser = await getUserFromRequest(request);
		if (!currentUser)
			return NextResponse.json(
				{ error: "Non authentifié" },
				{ status: 401 },
			);
		if (!hasPermission(currentUser.role, "create"))
			return NextResponse.json(
				{ error: "Permission insuffisante" },
				{ status: 403 },
			);

		const { name, description, status, priority, emoji, members } =
			await request.json();

		if (!name)
			return NextResponse.json(
				{ error: "Le nom est requis" },
				{ status: 400 },
			);

		const project = await prisma.project.create({
			data: {
				name,
				description: description || "",
				status: status || "active",
				priority: priority || "medium",
				emoji: emoji || "📁",
				members:
					members && members.length > 0
						? {
								create: members.map((id: number) => ({
									userId: parseInt(String(id)),
								})),
							}
						: undefined,
			},
			include: { members: MEMBERS_INCLUDE },
		});

		await prisma.log.create({
			data: {
				action: "Création projet",
				details: `Projet "${name}" créé`,
				userId: currentUser.id,
				userName: currentUser.name,
				module: "projects",
			},
		});

		return NextResponse.json(
			{
				...project,
				members: project.members.map((m) => m.user.id),
				membersData: project.members.map((m) => m.user),
			},
			{ status: 201 },
		);
	} catch (e) {
		return NextResponse.json(
			{ error: (e as Error).message },
			{ status: 500 },
		);
	}
}
