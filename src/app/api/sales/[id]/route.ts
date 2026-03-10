import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { ErrorMessages } from "@/types/constants";

/**
 * Get a single sale by ID
 * @param request - Incoming request
 * @param params - Route params with id
 * @returns Sale object
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
		const sale = await prisma.sale.findUnique({
			where: { id: parseInt(id) },
			include: {
				product: true,
				client: true,
				seller: { select: { id: true, name: true, username: true } },
			},
		});

		if (!sale)
			return NextResponse.json(
				{ error: "Vente introuvable" },
				{ status: 404 },
			);

		return NextResponse.json(sale);
	} catch (e) {
		return NextResponse.json(
			{ error: (e as Error).message },
			{ status: 500 },
		);
	}
}

/**
 * Update a sale by ID
 * @param request - Incoming request with update data
 * @param params - Route params with id
 * @returns Updated sale
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
		const { status, platform, date, clientId } = await request.json();

		const data: Record<string, unknown> = {};
		if (status) data.status = status;
		if (platform) data.platform = platform;
		if (date) data.date = new Date(date);
		if (clientId !== undefined)
			data.clientId = clientId ? parseInt(clientId) : null;

		const sale = await prisma.sale.update({
			where: { id: parseInt(id) },
			data,
			include: {
				product: { select: { id: true, name: true } },
				client: { select: { id: true, name: true } },
				seller: { select: { id: true, name: true } },
			},
		});

		return NextResponse.json(sale);
	} catch (e) {
		return NextResponse.json(
			{ error: (e as Error).message },
			{ status: 500 },
		);
	}
}

/**
 * Delete a sale by ID
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
		const saleId = parseInt(id);

		const sale = await prisma.sale.findUnique({ where: { id: saleId } });
		if (!sale)
			return NextResponse.json(
				{ error: "Vente introuvable" },
				{ status: 404 },
			);

		await prisma.sale.delete({ where: { id: saleId } });

		await prisma.log.create({
			data: {
				action: "Suppression vente",
				details: `Vente #${saleId} supprimée`,
				userId: currentUser.id,
				userName: currentUser.name,
				module: "sales",
			},
		});

		return NextResponse.json({ message: "Vente supprimée" });
	} catch (e) {
		return NextResponse.json(
			{ error: (e as Error).message },
			{ status: 500 },
		);
	}
}
