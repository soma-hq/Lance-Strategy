import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";

/**
 * List all products with stocks and stock history
 * @param request - Incoming request
 * @returns Products array with stock data
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

		const products = await prisma.product.findMany({
			orderBy: { createdAt: "desc" },
			include: {
				stocks: true,
				stockHistory: {
					orderBy: { date: "desc" },
					take: 50,
				},
			},
		});

		return NextResponse.json(products);
	} catch (e) {
		return NextResponse.json(
			{ error: (e as Error).message },
			{ status: 500 },
		);
	}
}

/**
 * Create a new product with optional initial stocks
 * @param request - Incoming request with product data
 * @returns Created product
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
			name,
			description,
			price,
			priceHT,
			sku,
			category,
			alertThreshold,
			stocks,
		} = await request.json();

		if (!name)
			return NextResponse.json(
				{ error: "Le nom est requis" },
				{ status: 400 },
			);

		const product = await prisma.product.create({
			data: {
				name,
				description: description || null,
				price: parseFloat(price || 0),
				priceHT: parseFloat(priceHT || 0),
				sku: sku || null,
				category: category || null,
				alertThreshold: parseInt(alertThreshold || 0),
			},
		});

		// Create initial user stocks if provided
		if (stocks && typeof stocks === "object") {
			for (const [username, quantity] of Object.entries(stocks)) {
				if ((quantity as number) > 0) {
					await prisma.userStock.create({
						data: {
							productId: product.id,
							username,
							quantity: quantity as number,
						},
					});
				}
			}
		}

		await prisma.log.create({
			data: {
				action: "Création produit",
				details: `Produit "${name}" créé`,
				userId: currentUser.id,
				userName: currentUser.name,
				module: "products",
			},
		});

		return NextResponse.json(product, { status: 201 });
	} catch (e) {
		return NextResponse.json(
			{ error: (e as Error).message },
			{ status: 500 },
		);
	}
}
