import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { AuthConfig } from "@/lib/config";
import { LogActions, LogModules } from "@/types/constants";

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
					action: LogActions.logout,
					details: `${user.name} d\u00e9connect\u00e9`,
					userId: user.id,
					userName: user.name,
					module: LogModules.auth,
				},
			});
		}

		// Clear the auth cookie
		const response = NextResponse.json({ message: "D\u00e9connect\u00e9" });
		response.cookies.set(AuthConfig.cookieName, "", {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: AuthConfig.cookieSameSite,
			maxAge: 0,
			path: "/",
		});

		return response;
	} catch {
		const response = NextResponse.json({ message: "D\u00e9connect\u00e9" });
		response.cookies.set(AuthConfig.cookieName, "", {
			maxAge: 0,
			path: "/",
		});
		return response;
	}
}
