import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";

/**
 * Get the currently authenticated user
 * @param request - Incoming request
 * @returns User object without password
 */

export async function GET(request: NextRequest) {
	const user = await getUserFromRequest(request);

	if (!user) {
		return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
	}

	const { password: _, ...userWithoutPassword } = user;

	return NextResponse.json(userWithoutPassword);
}
