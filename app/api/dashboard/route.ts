import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

/**
 * Get aggregated dashboard metrics.
 * Aggregations are performed in PostgreSQL via Prisma — no JS-side filtering.
 * @param request - Incoming request
 * @returns Dashboard data
 */
export async function GET(request: NextRequest) {
	try {
		const user = await getUserFromRequest(request);
		if (!user)
			return NextResponse.json(
				{ error: "Non authentifié" },
				{ status: 401 },
			);

		const now = new Date();
		const todayStart = new Date(
			now.getFullYear(),
			now.getMonth(),
			now.getDate(),
		);
		const weekStart = new Date(todayStart);
		weekStart.setDate(weekStart.getDate() - 6);
		const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
		const chartStart = new Date(todayStart);
		chartStart.setDate(chartStart.getDate() - 6);

		// ── Revenue aggregations (DB-side, no full scan) ──────────────────
		const [
			revToday,
			revWeek,
			revMonth,
			revTotal,
			salesToday,
			salesWeek,
			salesMonth,
			salesTotal,
			salesCancelled,
			activeTasks,
			completedTasks,
			totalClients,
			newClientsThisMonth,
			activeProjects,
			completedProjects,
			totalProjects,
			recentSales,
			overdueTaskList,
			chartSales,
			topProductGroups,
			recentLogs,
			upcomingEvents,
			allProducts,
		] = await Promise.all([
			// Revenue sums — only completed sales
			prisma.sale.aggregate({
				_sum: { totalTTC: true },
				where: { status: "completed", date: { gte: todayStart } },
			}),
			prisma.sale.aggregate({
				_sum: { totalTTC: true },
				where: { status: "completed", date: { gte: weekStart } },
			}),
			prisma.sale.aggregate({
				_sum: { totalTTC: true },
				where: { status: "completed", date: { gte: monthStart } },
			}),
			prisma.sale.aggregate({
				_sum: { totalTTC: true },
				where: { status: "completed" },
			}),

			// Sale counts
			prisma.sale.count({ where: { date: { gte: todayStart } } }),
			prisma.sale.count({ where: { date: { gte: weekStart } } }),
			prisma.sale.count({ where: { date: { gte: monthStart } } }),
			prisma.sale.count(),
			prisma.sale.count({ where: { status: "cancelled" } }),

			// Task counts
			prisma.task.count({
				where: {
					completed: false,
					cancelled: false,
					status: { notIn: ["realisee", "annulee"] },
				},
			}),
			prisma.task.count({
				where: { OR: [{ completed: true }, { status: "realisee" }] },
			}),

			// Client counts
			prisma.client.count(),
			prisma.client.count({ where: { createdAt: { gte: monthStart } } }),

			// Project counts
			prisma.project.count({ where: { status: "active" } }),
			prisma.project.count({ where: { status: "completed" } }),
			prisma.project.count(),

			// Recent sales (10) with minimal includes
			prisma.sale.findMany({
				take: 10,
				orderBy: { date: "desc" },
				include: {
					product: { select: { id: true, name: true } },
					client: { select: { id: true, name: true } },
					seller: {
						select: { id: true, name: true, username: true },
					},
				},
			}),

			// Overdue tasks (max 5) — DB filters instead of full fetch + JS filter
			prisma.task.findMany({
				where: {
					completed: false,
					cancelled: false,
					status: { notIn: ["realisee", "annulee"] },
					dueDate: { lt: todayStart },
				},
				take: 5,
				include: {
					assignee: {
						select: { id: true, name: true, avatar: true },
					},
					project: { select: { id: true, name: true } },
				},
			}),

			// Chart sales: minimal fields, last 7 days only
			prisma.sale.findMany({
				where: {
					status: "completed",
					date: { gte: chartStart },
				},
				select: { date: true, totalTTC: true },
			}),

			// Top 5 products by revenue via groupBy
			prisma.sale.groupBy({
				by: ["productId"],
				_sum: { totalTTC: true },
				where: { status: "completed" },
				orderBy: { _sum: { totalTTC: "desc" } },
				take: 5,
			}),

			// Recent logs
			prisma.log.findMany({
				take: 10,
				orderBy: { timestamp: "desc" },
				include: {
					user: { select: { id: true, name: true, avatar: true } },
				},
			}),

			// Upcoming events
			prisma.event.findMany({
				where: { date: { gte: now } },
				orderBy: { date: "asc" },
				take: 5,
				include: { user: { select: { id: true, name: true } } },
			}),

			// Products for stock alerts (only fields needed)
			prisma.product.findMany({
				select: {
					id: true,
					name: true,
					alertThreshold: true,
					stocks: { select: { quantity: true } },
				},
			}),
		]);

		// ── Post-process top products: resolve product names ──────────────
		const productIds = topProductGroups.map((g) => g.productId);
		const productNames = await prisma.product.findMany({
			where: { id: { in: productIds } },
			select: { id: true, name: true },
		});
		const nameById = Object.fromEntries(productNames.map((p) => [p.id, p.name]));

		const topProducts = topProductGroups.map((g) => ({
			name: nameById[g.productId] ?? `Produit #${g.productId}`,
			revenue: g._sum.totalTTC ?? 0,
		}));

		// ── Daily revenue chart (last 7 days, computed from minimal data) ─
		const dailyRevenue = Array.from({ length: 7 }, (_, i) => {
			const date = new Date(chartStart);
			date.setDate(date.getDate() + i);
			const dayEnd = new Date(date);
			dayEnd.setDate(dayEnd.getDate() + 1);

			const daySales = chartSales.filter((s) => {
				const d = new Date(s.date);
				return d >= date && d < dayEnd;
			});

			return {
				date: date.toISOString().slice(0, 10),
				label: date.toLocaleDateString("fr-FR", {
					weekday: "short",
					day: "numeric",
				}),
				revenue: daySales.reduce((sum, s) => sum + s.totalTTC, 0),
				count: daySales.length,
			};
		});

		// ── Critical stock products ────────────────────────────────────────
		const criticalProducts = allProducts
			.map((p) => ({
				...p,
				totalStock: p.stocks.reduce((sum, s) => sum + s.quantity, 0),
			}))
			.filter((p) => p.totalStock <= p.alertThreshold);

		// ── Overdue count (from overdueTaskList but also total count) ─────
		const overdueCount = await prisma.task.count({
			where: {
				completed: false,
				cancelled: false,
				status: { notIn: ["realisee", "annulee"] },
				dueDate: { lt: todayStart },
			},
		});

		return NextResponse.json({
			revenue: {
				today: revToday._sum.totalTTC ?? 0,
				week: revWeek._sum.totalTTC ?? 0,
				month: revMonth._sum.totalTTC ?? 0,
				total: revTotal._sum.totalTTC ?? 0,
			},
			sales: {
				today: salesToday,
				week: salesWeek,
				month: salesMonth,
				total: salesTotal,
				cancelled: salesCancelled,
				recent: recentSales,
			},
			tasks: {
				active: activeTasks,
				completed: completedTasks,
				overdue: overdueCount,
				overdueList: overdueTaskList,
			},
			clients: {
				total: totalClients,
				newThisMonth: newClientsThisMonth,
			},
			products: {
				total: allProducts.length,
				criticalStock: criticalProducts.length,
				criticalList: criticalProducts.slice(0, 5).map((p) => ({
					id: p.id,
					name: p.name,
					totalStock: p.totalStock,
					alertThreshold: p.alertThreshold,
				})),
			},
			projects: {
				active: activeProjects,
				completed: completedProjects,
				total: totalProjects,
			},
			charts: { dailyRevenue, topProducts },
			recentLogs,
			upcomingEvents,
		});
	} catch (e) {
		return NextResponse.json(
			{ error: (e as Error).message },
			{ status: 500 },
		);
	}
}
