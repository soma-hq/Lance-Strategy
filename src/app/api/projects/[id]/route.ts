import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { ErrorMessages } from "@/types/constants";

const MEMBERS_INCLUDE = {
	include: {
		user: {
			select: { id: true, name: true, username: true, avatar: true },
		},
	},
};

/**
 * Get a single project with members and tasks
 * @param request - Incoming request
 * @param params - Route params with id
 * @returns Project object
 */

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const user = await getUserFromRequest(request);
		if (!user)
			return NextResponse.json(
				{ error: ErrorMessages.unauthorized },
				{ status: 401 },
			);
		if (!hasPermission(user.role, "view"))
			return NextResponse.json(
				{ error: ErrorMessages.forbidden },
				{ status: 403 },
			);

		const { id } = await params;
		const project = await prisma.project.findUnique({
			where: { id: parseInt(id) },
			include: {
				members: MEMBERS_INCLUDE,
				tasks: {
					include: {
						assignee: {
							select: { id: true, name: true, avatar: true },
						},
					},
				},
			},
		});

		if (!project)
			return NextResponse.json(
				{ error: "Projet introuvable" },
				{ status: 404 },
			);

		return NextResponse.json({
			...project,
			members: project.members.map((m) => m.user.id),
			membersData: project.members.map((m) => m.user),
		});
	} catch (e) {
		return NextResponse.json(
			{ error: (e as Error).message },
			{ status: 500 },
		);
	}
}

/**
 * Update a project by ID, including members replacement
 * @param request - Incoming request with update data
 * @param params - Route params with id
 * @returns Updated project
 */

export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const currentUser = await getUserFromRequest(request);
		if (!currentUser)
			return NextResponse.json(
				{ error: ErrorMessages.unauthorized },
				{ status: 401 },
			);
		if (!hasPermission(currentUser.role, "edit"))
			return NextResponse.json(
				{ error: ErrorMessages.forbidden },
				{ status: 403 },
			);

		const { id } = await params;
		const projectId = parseInt(id);
		const { name, description, status, priority, emoji, members } =
			await request.json();

		const data: Record<string, unknown> = {};
		if (name !== undefined) data.name = name;
		if (description !== undefined) data.description = description;
		if (status !== undefined) data.status = status;
		if (priority !== undefined) data.priority = priority;
		if (emoji !== undefined) data.emoji = emoji;

		// Replace all members if provided
		if (members !== undefined) {
			await prisma.projectMember.deleteMany({ where: { projectId } });
			if (members.length > 0) {
				data.members = {
					create: members.map((uid: number) => ({
						userId: parseInt(String(uid)),
					})),
				};
			}
		}

		const project = await prisma.project.update({
			where: { id: projectId },
			data,
			include: { members: MEMBERS_INCLUDE },
		});

		return NextResponse.json({
			...project,
			members: project.members.map((m) => m.user.id),
			membersData: project.members.map((m) => m.user),
		});
	} catch (e) {
		return NextResponse.json(
			{ error: (e as Error).message },
			{ status: 500 },
		);
	}
}

/**
 * Delete a project by ID
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
				{ error: ErrorMessages.unauthorized },
				{ status: 401 },
			);
		if (!hasPermission(currentUser.role, "delete"))
			return NextResponse.json(
				{ error: ErrorMessages.forbidden },
				{ status: 403 },
			);

		const { id } = await params;
		const project = await prisma.project.findUnique({
			where: { id: parseInt(id) },
		});
		if (!project)
			return NextResponse.json(
				{ error: "Projet introuvable" },
				{ status: 404 },
			);

		await prisma.project.delete({ where: { id: parseInt(id) } });

		await prisma.log.create({
			data: {
				action: "Suppression projet",
				details: `Projet "${project.name}" supprimé`,
				userId: currentUser.id,
				userName: currentUser.name,
				module: "projects",
			},
		});

		return NextResponse.json({ message: "Projet supprimé" });
	} catch (e) {
		return NextResponse.json(
			{ error: (e as Error).message },
			{ status: 500 },
		);
	}
}
