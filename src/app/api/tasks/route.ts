import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/handler";

const TASK_INCLUDE = {
	assignee: {
		select: { id: true, name: true, username: true, avatar: true },
	},
	project: { select: { id: true, name: true, emoji: true } },
	comments: { orderBy: { createdAt: "desc" as const } },
};

/**
 * List tasks with optional filters.
 */
export const GET = withAuth("view", async (request) => {
	const { searchParams } = new URL(request.url);
	const status = searchParams.get("status");
	const assigneeId = searchParams.get("assigneeId");
	const projectId = searchParams.get("projectId");
	const priority = searchParams.get("priority");

	const where: Record<string, unknown> = {};
	if (status) where.status = status;
	if (assigneeId) where.assigneeId = parseInt(assigneeId);
	if (projectId) where.projectId = parseInt(projectId);
	if (priority) where.priority = priority;

	const tasks = await prisma.task.findMany({
		where,
		include: TASK_INCLUDE,
		orderBy: { createdAt: "desc" },
	});

	return NextResponse.json(tasks);
});

/**
 * Create a new task.
 */
export const POST = withAuth("create", async (request, currentUser) => {
	const { title, description, dueDate, status, priority, assigneeId, projectId } =
		await request.json();

	if (!title)
		return NextResponse.json(
			{ error: "Le titre est requis" },
			{ status: 400 },
		);

	const task = await prisma.task.create({
		data: {
			title,
			description: description || "",
			dueDate: dueDate ? new Date(dueDate) : null,
			status: status || "en_cours",
			priority: priority || "medium",
			assigneeId: assigneeId ? parseInt(assigneeId) : null,
			projectId: projectId ? parseInt(projectId) : null,
		},
		include: TASK_INCLUDE,
	});

	await prisma.log.create({
		data: {
			action: "Création tâche",
			details: `Tâche "${title}" créée`,
			userId: currentUser.id,
			userName: currentUser.name,
			module: "tasks",
		},
	});

	return NextResponse.json(task, { status: 201 });
});
