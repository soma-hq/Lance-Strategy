import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/handler";

const SALE_INCLUDE = {
	product: { select: { id: true, name: true } },
	client: { select: { id: true, name: true } },
	seller: { select: { id: true, name: true, username: true } },
};

/**
 * List sales with optional filters.
 */
export const GET = withAuth("view", async (request) => {
	const { searchParams } = new URL(request.url);
	const status = searchParams.get("status");
	const sellerId = searchParams.get("sellerId");
	const clientId = searchParams.get("clientId");
	const productId = searchParams.get("productId");
	const from = searchParams.get("from");
	const to = searchParams.get("to");
	const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
	const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "20")));

	const where: Record<string, unknown> = {};
	if (status) where.status = status;
	if (sellerId) where.sellerId = parseInt(sellerId);
	if (clientId) where.clientId = parseInt(clientId);
	if (productId) where.productId = parseInt(productId);
	if (from || to) {
		where.date = {};
		if (from) (where.date as Record<string, Date>).gte = new Date(from);
		if (to) (where.date as Record<string, Date>).lte = new Date(to);
	}

	const [sales, total] = await Promise.all([
		prisma.sale.findMany({
			where,
			include: SALE_INCLUDE,
			orderBy: { date: "desc" },
			skip: (page - 1) * limit,
			take: limit,
		}),
		prisma.sale.count({ where }),
	]);

	return NextResponse.json({ sales, total });
});

/**
 * Create a new sale and optionally deduct stock.
 * NOTE: seller is already included in the create result — no extra findUnique needed.
 */
export const POST = withAuth("create", async (request, currentUser) => {
	const {
		productId,
		clientId,
		sellerId,
		quantity,
		unitPriceTTC,
		unitPriceHT,
		totalTTC,
		totalHT,
		status,
		platform,
		date,
	} = await request.json();

	if (!productId || !sellerId || !quantity) {
		return NextResponse.json(
			{ error: "Champs requis : productId, sellerId, quantity" },
			{ status: 400 },
		);
	}

	const sale = await prisma.sale.create({
		data: {
			productId: parseInt(productId),
			clientId: clientId ? parseInt(clientId) : null,
			sellerId: parseInt(sellerId),
			quantity: parseInt(quantity),
			unitPriceTTC: parseFloat(unitPriceTTC || 0),
			unitPriceHT: parseFloat(unitPriceHT || 0),
			totalTTC: parseFloat(totalTTC || 0),
			totalHT: parseFloat(totalHT || 0),
			status: status || "completed",
			platform: platform || "vente_locale",
			date: date ? new Date(date) : new Date(),
		},
		include: SALE_INCLUDE,
	});

	// Deduct stock if completed.
	// sale.seller is already loaded above — no extra findUnique needed.
	if (sale.status === "completed" && sale.seller) {
		const { username, name } = sale.seller;

		const stock = await prisma.userStock.findUnique({
			where: {
				productId_username: {
					productId: sale.productId,
					username,
				},
			},
		});

		const currentQty = stock?.quantity ?? 0;
		const newQty = Math.max(0, currentQty - sale.quantity);

		await prisma.userStock.upsert({
			where: { productId_username: { productId: sale.productId, username } },
			update: { quantity: newQty },
			create: { productId: sale.productId, username, quantity: newQty },
		});

		await prisma.stockHistory.create({
			data: {
				productId: sale.productId,
				type: "sale",
				quantity: sale.quantity,
				stockBefore: currentQty,
				stockAfter: newQty,
				userId: sale.sellerId,
				user: name,
				reason: "Vente",
				reference: `SALE-${sale.id}`,
			},
		});
	}

	await prisma.log.create({
		data: {
			action: "Création vente",
			details: `Vente créée — ${sale.quantity}x ${sale.product.name}`,
			userId: currentUser.id,
			userName: currentUser.name,
			module: "sales",
		},
	});

	return NextResponse.json(sale, { status: 201 });
});
