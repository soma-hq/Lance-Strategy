"use client";

import { createContext, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@/types";

interface AuthContextValue {
	user: User | null;
	loading: boolean;
	logout: () => Promise<void>;
	refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
	user: null,
	loading: true,
	logout: async () => {},
	refresh: async () => {},
});

/**
 * Fetch current user from the API
 * @param signal - Optional AbortSignal to cancel the request
 * @returns User data or null
 */

async function fetchCurrentUser(signal?: AbortSignal): Promise<User | null> {
	try {
		const res = await fetch("/api/auth/me", {
			credentials: "include",
			signal,
		});
		if (!res.ok) return null;
		return await res.json();
	} catch {
		return null;
	}
}

/**
 * Provide authentication state to the component tree
 * @param children - Child components
 * @returns Auth context provider
 */

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);
	const router = useRouter();

	// External refresh: used by login page after successful login
	const refresh = useCallback(async () => {
		setLoading(true);
		try {
			const u = await fetchCurrentUser();
			setUser(u);
		} finally {
			setLoading(false);
		}
	}, []);

	// Initial load with proper cleanup to avoid Strict Mode double-run
	useEffect(() => {
		let cancelled = false;
		const controller = new AbortController();

		setLoading(true);
		fetchCurrentUser(controller.signal)
			.then((u) => {
				if (!cancelled) {
					setUser(u);
					setLoading(false);
				}
			})
			.catch(() => {
				if (!cancelled) setLoading(false);
			});

		return () => {
			cancelled = true;
			controller.abort();
		};
	}, []);

	const logout = useCallback(async () => {
		await fetch("/api/auth/logout", {
			method: "POST",
			credentials: "include",
		});
		setUser(null);
		router.push("/login");
	}, [router]);

	return (
		<AuthContext.Provider value={{ user, loading, logout, refresh }}>
			{children}
		</AuthContext.Provider>
	);
}

export { AuthContext };
