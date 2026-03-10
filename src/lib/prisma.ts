import { PrismaClient } from "@prisma/client";

declare global {
	var prisma: PrismaClient | undefined;
}

/**
 * Get or create the global Prisma singleton
 * @returns PrismaClient instance
 */

const db = globalThis.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalThis.prisma = db;

export { db as prisma };
