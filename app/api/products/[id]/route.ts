import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";

/**
 * Get a single product with stocks and history
 * @param request - Incoming request
 * @param params - Route params with id
 * @returns Product object
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
		const product = await prisma.product.findUnique({
			where: { id: parseInt(id) },
			include: {
				stocks: true,
				stockHistory: {
					orderBy: { date: "desc" },
					take: 50,
				},
			},
		});

		if (!product)
			return NextResponse.json(
				{ error: "Produit introuvable" },
				{ status: 404 },
			);

		return NextResponse.json(product);
	} catch (e) {
		return NextResponse.json(
			{ error: (e as Error).message },
			{ status: 500 },
		);
	}
}

/**
 * Update a product by ID
 * @param request - Incoming request with update data
 * @param params - Route params with id
 * @returns Updated product
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
			name,
			description,
			price,
			priceHT,
			sku,
			category,
			alertThreshold,
		} = await request.json();

		const data: Record<string, unknown> = {};
		if (name !== undefined) data.name = name;
		if (description !== undefined) data.description = description;
		if (price !== undefined) data.price = parseFloat(price);
		if (priceHT !== undefined) data.priceHT = parseFloat(priceHT);
		if (sku !== undefined) data.sku = sku;
		if (category !== undefined) data.category = category;
		if (alertThreshold !== undefined)
			data.alertThreshold = parseInt(alertThreshold);

		const product = await prisma.product.update({
			where: { id: parseInt(id) },
			data,
		});

		await prisma.log.create({
			data: {
				action: "Modification produit",
				details: `Produit "${product.name}" modifié`,
				userId: currentUser.id,
				userName: currentUser.name,
				module: "products",
			},
		});

		return NextResponse.json(product);
	} catch (e) {
		return NextResponse.json(
			{ error: (e as Error).message },
			{ status: 500 },
		);
	}
}

/**
 * Delete a product by ID
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
		const product = await prisma.product.findUnique({
			where: { id: parseInt(id) },
		});
		if (!product)
			return NextResponse.json(
				{ error: "Produit introuvable" },
				{ status: 404 },
			);

		await prisma.product.delete({ where: { id: parseInt(id) } });

		await prisma.log.create({
			data: {
				action: "Suppression produit",
				details: `Produit "${product.name}" supprimé`,
				userId: currentUser.id,
				userName: currentUser.name,
				module: "products",
			},
		});

		return NextResponse.json({ message: "Produit supprimé" });
	} catch (e) {
		return NextResponse.json(
			{ error: (e as Error).message },
			{ status: 500 },
		);
	}
}
