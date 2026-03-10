import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { ErrorMessages } from "@/types/constants";

/**
 * Adjust stock for a product/user combination
 * @param request - Incoming request with stock adjustment data
 * @param params - Route params with product id
 * @returns Updated stock info
 */

export async function POST(
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
		const productId = parseInt(id);
		const { username, type, quantity, reason } = await request.json();

		if (!username || !type || quantity === undefined) {
			return NextResponse.json(
				{ error: "Champs requis : username, type, quantity" },
				{ status: 400 },
			);
		}

		// Get current stock
		const currentStock = await prisma.userStock.findUnique({
			where: { productId_username: { productId, username } },
		});

		const currentQty = currentStock?.quantity ?? 0;
		let newQty: number;

		// Calculate new quantity based on type
		if (type === "entry") {
			newQty = currentQty + parseInt(quantity);
		} else if (type === "exit") {
			newQty = Math.max(0, currentQty - parseInt(quantity));
		} else if (type === "set") {
			newQty = parseInt(quantity);
		} else {
			return NextResponse.json(
				{ error: "Type invalide (entry/exit/set)" },
				{ status: 400 },
			);
		}

		// Upsert stock record
		const stock = await prisma.userStock.upsert({
			where: { productId_username: { productId, username } },
			update: { quantity: newQty },
			create: { productId, username, quantity: newQty },
		});

		// Record history
		await prisma.stockHistory.create({
			data: {
				productId,
				type,
				quantity: Math.abs(parseInt(quantity)),
				stockBefore: currentQty,
				stockAfter: newQty,
				userId: currentUser.id,
				user: currentUser.name,
				reason: reason || null,
			},
		});

		await prisma.log.create({
			data: {
				action: "Ajustement stock",
				details: `Stock de ${username} ajusté: ${currentQty} → ${newQty}`,
				userId: currentUser.id,
				userName: currentUser.name,
				module: "products",
			},
		});

		return NextResponse.json(stock);
	} catch (e) {
		return NextResponse.json(
			{ error: (e as Error).message },
			{ status: 500 },
		);
	}
}
