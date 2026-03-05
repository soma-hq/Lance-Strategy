"use client";

import {
	createContext,
	useContext,
	useEffect,
	useState,
	useCallback,
} from "react";
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
 * @returns User data or null
 */

async function fetchCurrentUser(): Promise<User | null> {
	try {
		const res = await fetch("/api/auth/me", { credentials: "include" });
		if (!res.ok) return null;
		return res.json();
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

	const refresh = useCallback(async () => {
		setLoading(true);
		const u = await fetchCurrentUser();
		setUser(u);
		setLoading(false);
	}, []);

	useEffect(() => {
		refresh();
	}, [refresh]);

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
