import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";

/**
 * List events with optional filters
 * @param request - Incoming request with query params
 * @returns Events array
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

		const { searchParams } = new URL(request.url);
		const from = searchParams.get("from");
		const to = searchParams.get("to");
		const type = searchParams.get("type");
		const userId = searchParams.get("userId");

		const where: Record<string, unknown> = {};
		if (type) where.type = type;
		if (userId) where.userId = parseInt(userId);
		if (from || to) {
			where.date = {};
			if (from) (where.date as Record<string, Date>).gte = new Date(from);
			if (to) (where.date as Record<string, Date>).lte = new Date(to);
		}

		const events = await prisma.event.findMany({
			where,
			orderBy: { date: "asc" },
			include: {
				user: { select: { id: true, name: true, avatar: true } },
			},
		});

		return NextResponse.json(events);
	} catch (e) {
		return NextResponse.json(
			{ error: (e as Error).message },
			{ status: 500 },
		);
	}
}

/**
 * Create a new event
 * @param request - Incoming request with event data
 * @returns Created event
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

		if (!title || !date) {
			return NextResponse.json(
				{ error: "Champs requis : title, date" },
				{ status: 400 },
			);
		}

		const event = await prisma.event.create({
			data: {
				title,
				description: description || "",
				date: new Date(date),
				endDate: endDate ? new Date(endDate) : null,
				type: type || "reminder",
				color: color || "#2e4a8a",
				userId: currentUser.id,
				projectId: projectId ? parseInt(projectId) : null,
				allDay: allDay !== undefined ? allDay : true,
			},
			include: {
				user: { select: { id: true, name: true, avatar: true } },
			},
		});

		return NextResponse.json(event, { status: 201 });
	} catch (e) {
		return NextResponse.json(
			{ error: (e as Error).message },
			{ status: 500 },
		);
	}
}
