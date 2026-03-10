"use client";

import { useContext } from "react";
import { AuthContext } from "@/components/providers/AuthProvider";

/**
 * Get the current authentication state
 * @returns User, loading state, logout and refresh functions
 */

export function useAuth() {
	return useContext(AuthContext);
}
