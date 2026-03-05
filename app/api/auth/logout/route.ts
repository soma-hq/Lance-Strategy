import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

/**
 * Handle user logout by clearing auth cookie
 * @param request - Incoming request
 * @returns Success message
 */

export async function POST(request: NextRequest) {
	try {
		const user = await getUserFromRequest(request);

		if (user) {
			// Log the disconnection
			await prisma.log.create({
				data: {
					action: "Déconnexion",
					details: `${user.name} déconnecté`,
					userId: user.id,
					userName: user.name,
					module: "auth",
				},
			});
		}

		// Clear the auth cookie
		const response = NextResponse.json({ message: "Déconnecté" });
		response.cookies.set("token", "", {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			maxAge: 0,
			path: "/",
		});

		return response;
	} catch {
		const response = NextResponse.json({ message: "Déconnecté" });
		response.cookies.set("token", "", { maxAge: 0, path: "/" });
		return response;
	}
}
