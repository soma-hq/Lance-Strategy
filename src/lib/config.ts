import authJson from "@/configuration/auth.json";
import apiJson from "@/configuration/api.json";
import dashboardJson from "@/configuration/dashboard.json";
import rateLimitsJson from "@/configuration/rate-limits.json";
import appJson from "@/configuration/app.json";
import invoiceJson from "@/configuration/invoice.json";

// Auth cookie and token settings
export const AuthConfig = authJson as {
	tokenExpiresIn: string;
	cookieName: string;
	cookieMaxAgeSec: number;
	cookieSameSite: "lax" | "strict" | "none";
	bearerPrefix: string;
};

// Pagination and query limit defaults
export const ApiConfig = apiJson as {
	defaultPage: number;
	defaultLimit: number;
	maxLimit: number;
	logsDefaultLimit: number;
	stockHistoryTake: number;
};

// Dashboard widget data limits
export const DashboardConfig = dashboardJson as {
	recentSales: number;
	overdueTasks: number;
	topProducts: number;
	upcomingEvents: number;
	recentLogs: number;
	chartLookbackDays: number;
};

// Rate limit thresholds per route
export const RateLimitsConfig = rateLimitsJson as {
	login: { maxAttempts: number; windowMs: number };
};

// Application-level metadata
export const AppConfig = appJson as {
	name: string;
	description: string;
	locale: string;
	currency: string;
	timezone: string;
};

// Invoice and company details
export const InvoiceConfig = invoiceJson as {
	company: {
		name: string;
		legalForm: string;
		address: string;
		postalCode: string;
		city: string;
		country: string;
		phone: string;
		email: string;
		website: string;
		siret: string;
		nafCode: string;
		tvaNumber: string;
		rcs: string;
		capital: string;
	};
	invoice: {
		prefix: string;
		defaultTvaRate: number;
		latePaymentPenalty: number;
	};
	paymentTerms: string;
	latePaymentNotice: string;
};
