import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";

/**
 * Get a single event by ID
 * @param request - Incoming request
 * @param params - Route params with id
 * @returns Event object
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
		const event = await prisma.event.findUnique({
			where: { id: parseInt(id) },
			include: {
				user: { select: { id: true, name: true, avatar: true } },
			},
		});

		if (!event)
			return NextResponse.json(
				{ error: "Événement introuvable" },
				{ status: 404 },
			);

		return NextResponse.json(event);
	} catch (e) {
		return NextResponse.json(
			{ error: (e as Error).message },
			{ status: 500 },
		);
	}
}

/**
 * Update an event by ID
 * @param request - Incoming request with update data
 * @param params - Route params with id
 * @returns Updated event
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
			date,
			endDate,
			type,
			color,
			projectId,
			allDay,
		} = await request.json();

		const data: Record<string, unknown> = {};
		if (title !== undefined) data.title = title;
		if (description !== undefined) data.description = description;
		if (date !== undefined) data.date = new Date(date);
		if (endDate !== undefined)
			data.endDate = endDate ? new Date(endDate) : null;
		if (type !== undefined) data.type = type;
		if (color !== undefined) data.color = color;
		if (projectId !== undefined)
			data.projectId = projectId ? parseInt(projectId) : null;
		if (allDay !== undefined) data.allDay = allDay;

		const event = await prisma.event.update({
			where: { id: parseInt(id) },
			data,
			include: {
				user: { select: { id: true, name: true, avatar: true } },
			},
		});

		return NextResponse.json(event);
	} catch (e) {
		return NextResponse.json(
			{ error: (e as Error).message },
			{ status: 500 },
		);
	}
}

/**
 * Delete an event by ID
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
		await prisma.event.delete({ where: { id: parseInt(id) } });

		return NextResponse.json({ message: "Événement supprimé" });
	} catch (e) {
		return NextResponse.json(
			{ error: (e as Error).message },
			{ status: 500 },
		);
	}
}
