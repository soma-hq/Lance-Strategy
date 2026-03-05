import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";

const TASK_INCLUDE = {
	assignee: {
		select: { id: true, name: true, username: true, avatar: true },
	},
	project: { select: { id: true, name: true, emoji: true } },
	comments: { orderBy: { createdAt: "asc" as const } },
};

/**
 * Get a single task by ID
 * @param request - Incoming request
 * @param params - Route params with id
 * @returns Task object
 */

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
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

		const { id } = await params;
		const task = await prisma.task.findUnique({
			where: { id: parseInt(id) },
			include: TASK_INCLUDE,
		});

		if (!task)
			return NextResponse.json(
				{ error: "Tâche introuvable" },
				{ status: 404 },
			);

		return NextResponse.json(task);
	} catch (e) {
		return NextResponse.json(
			{ error: (e as Error).message },
			{ status: 500 },
		);
	}
}

/**
 * Update a task by ID
 * @param request - Incoming request with update data
 * @param params - Route params with id
 * @returns Updated task
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
		if (!hasPermission(currentUser.role, "edit"))
			return NextResponse.json(
				{ error: "Permission insuffisante" },
				{ status: 403 },
			);

		const { id } = await params;
		const {
			title,
			description,
			dueDate,
			status,
			priority,
			assigneeId,
			projectId,
			completed,
			cancelled,
		} = await request.json();

		const data: Record<string, unknown> = {};
		if (title !== undefined) data.title = title;
		if (description !== undefined) data.description = description;
		if (dueDate !== undefined)
			data.dueDate = dueDate ? new Date(dueDate) : null;
		if (status !== undefined) data.status = status;
		if (priority !== undefined) data.priority = priority;
		if (assigneeId !== undefined)
			data.assigneeId = assigneeId ? parseInt(assigneeId) : null;
		if (projectId !== undefined)
			data.projectId = projectId ? parseInt(projectId) : null;
		if (completed !== undefined) data.completed = completed;
		if (cancelled !== undefined) data.cancelled = cancelled;

		const task = await prisma.task.update({
			where: { id: parseInt(id) },
			data,
			include: TASK_INCLUDE,
		});

		return NextResponse.json(task);
	} catch (e) {
		return NextResponse.json(
			{ error: (e as Error).message },
			{ status: 500 },
		);
	}
}

/**
 * Delete a task by ID
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
		if (!hasPermission(currentUser.role, "delete"))
			return NextResponse.json(
				{ error: "Permission insuffisante" },
				{ status: 403 },
			);

		const { id } = await params;
		const task = await prisma.task.findUnique({
			where: { id: parseInt(id) },
		});
		if (!task)
			return NextResponse.json(
				{ error: "Tâche introuvable" },
				{ status: 404 },
			);

		await prisma.task.delete({ where: { id: parseInt(id) } });

		return NextResponse.json({ message: "Tâche supprimée" });
	} catch (e) {
		return NextResponse.json(
			{ error: (e as Error).message },
			{ status: 500 },
		);
	}
}
