interface RateBucket {
	count: number;
	resetAt: number;
}

const store = new Map<string, RateBucket>();

// Clean up expired entries every 5 minutes to prevent memory leaks
if (typeof setInterval !== "undefined") {
	setInterval(
		() => {
			const now = Date.now();
			for (const [key, bucket] of store.entries()) {
				if (now > bucket.resetAt) store.delete(key);
			}
		},
		5 * 60 * 1000,
	);
}

/**
 * Check and increment a rate-limit bucket.
 * Returns true if the request is allowed, false if it should be blocked.
 *
 * @param key - Unique identifier for the bucket (e.g. IP address)
 * @param maxRequests - Maximum number of requests allowed in the window
 * @param windowMs - Window duration in milliseconds
 */
export function rateLimit(
	key: string,
	maxRequests: number,
	windowMs: number,
): boolean {
	const now = Date.now();
	const bucket = store.get(key);

	if (!bucket || now > bucket.resetAt) {
		store.set(key, { count: 1, resetAt: now + windowMs });
		return true;
	}

	if (bucket.count >= maxRequests) return false;

	bucket.count++;
	return true;
}

/**
 * Get the client IP from a Next.js request, with fallback.
 * @param req - Incoming Next.js request
 */
export function getClientIp(req: Request): string {
	return (
		req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
		req.headers.get("x-real-ip") ??
		"unknown"
	);
}
