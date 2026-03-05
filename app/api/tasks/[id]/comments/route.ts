import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";

/**
 * Add a comment to a task
 * @param request - Incoming request with comment content
 * @param params - Route params with task id
 * @returns Created comment
 */

export async function POST(
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
		if (!hasPermission(currentUser.role, "create"))
			return NextResponse.json(
				{ error: "Permission insuffisante" },
				{ status: 403 },
			);

		const { id } = await params;
		const { content } = await request.json();

		if (!content)
			return NextResponse.json(
				{ error: "Le contenu est requis" },
				{ status: 400 },
			);

		const comment = await prisma.taskComment.create({
			data: {
				taskId: parseInt(id),
				userId: currentUser.id,
				content,
			},
		});

		// Attach author data manually (no Prisma relation on TaskComment)
		const userRecord = await prisma.user.findUnique({
			where: { id: currentUser.id },
			select: { id: true, name: true, avatar: true },
		});

		return NextResponse.json(
			{ ...comment, user: userRecord ?? null },
			{ status: 201 },
		);
	} catch (e) {
		return NextResponse.json(
			{ error: (e as Error).message },
			{ status: 500 },
		);
	}
}
