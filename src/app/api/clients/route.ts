import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { ErrorMessages } from "@/types/constants";

/**
 * List all clients with their sales summary
 * @param request - Incoming request
 * @returns Clients array
 */

export async function GET(request: NextRequest) {
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

		const clients = await prisma.client.findMany({
			orderBy: { createdAt: "desc" },
			include: {
				sales: {
					select: {
						id: true,
						totalTTC: true,
						status: true,
						date: true,
					},
				},
			},
		});

		return NextResponse.json(clients);
	} catch (e) {
		return NextResponse.json(
			{ error: (e as Error).message },
			{ status: 500 },
		);
	}
}

/**
 * Create a new client
 * @param request - Incoming request with client data
 * @returns Created client
 */

export async function POST(request: NextRequest) {
	try {
		const currentUser = await getUserFromRequest(request);
		if (!currentUser)
			return NextResponse.json(
				{ error: ErrorMessages.unauthorized },
				{ status: 401 },
			);
		if (!hasPermission(currentUser.role, "create"))
			return NextResponse.json(
				{ error: ErrorMessages.forbidden },
				{ status: 403 },
			);

		const { name, email, phone, company, status, notes } =
			await request.json();

		if (!name)
			return NextResponse.json(
				{ error: "Le nom est requis" },
				{ status: 400 },
			);

		const client = await prisma.client.create({
			data: {
				name,
				email: email || "",
				phone: phone || "",
				company: company || "",
				status: status || "one-shot",
				notes: notes || "",
			},
		});

		await prisma.log.create({
			data: {
				action: "Création client",
				details: `Client "${name}" créé`,
				userId: currentUser.id,
				userName: currentUser.name,
				module: "clients",
			},
		});

		return NextResponse.json(client, { status: 201 });
	} catch (e) {
		return NextResponse.json(
			{ error: (e as Error).message },
			{ status: 500 },
		);
	}
}
