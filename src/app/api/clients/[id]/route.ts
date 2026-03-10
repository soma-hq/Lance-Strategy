import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { ErrorMessages } from "@/types/constants";

/**
 * Get a single client with full sales history
 * @param request - Incoming request
 * @param params - Route params with id
 * @returns Client object
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
		const client = await prisma.client.findUnique({
			where: { id: parseInt(id) },
			include: {
				sales: {
					include: { product: { select: { id: true, name: true } } },
					orderBy: { date: "desc" },
				},
			},
		});

		if (!client)
			return NextResponse.json(
				{ error: "Client introuvable" },
				{ status: 404 },
			);

		return NextResponse.json(client);
	} catch (e) {
		return NextResponse.json(
			{ error: (e as Error).message },
			{ status: 500 },
		);
	}
}

/**
 * Update a client by ID
 * @param request - Incoming request with update data
 * @param params - Route params with id
 * @returns Updated client
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
		const { name, email, phone, company, status, notes } =
			await request.json();

		const data: Record<string, unknown> = {};
		if (name !== undefined) data.name = name;
		if (email !== undefined) data.email = email;
		if (phone !== undefined) data.phone = phone;
		if (company !== undefined) data.company = company;
		if (status !== undefined) data.status = status;
		if (notes !== undefined) data.notes = notes;

		const client = await prisma.client.update({
			where: { id: parseInt(id) },
			data,
		});

		await prisma.log.create({
			data: {
				action: "Modification client",
				details: `Client "${client.name}" modifié`,
				userId: currentUser.id,
				userName: currentUser.name,
				module: "clients",
			},
		});

		return NextResponse.json(client);
	} catch (e) {
		return NextResponse.json(
			{ error: (e as Error).message },
			{ status: 500 },
		);
	}
}

/**
 * Delete a client by ID
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
		const client = await prisma.client.findUnique({
			where: { id: parseInt(id) },
		});
		if (!client)
			return NextResponse.json(
				{ error: "Client introuvable" },
				{ status: 404 },
			);

		await prisma.client.delete({ where: { id: parseInt(id) } });

		await prisma.log.create({
			data: {
				action: "Suppression client",
				details: `Client "${client.name}" supprimé`,
				userId: currentUser.id,
				userName: currentUser.name,
				module: "clients",
			},
		});

		return NextResponse.json({ message: "Client supprimé" });
	} catch (e) {
		return NextResponse.json(
			{ error: (e as Error).message },
			{ status: 500 },
		);
	}
}
