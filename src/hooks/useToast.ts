"use client";

import { useContext } from "react";
import { ToastContext } from "@/components/ui/Toast";

/**
 * Get toast notification controls
 * @returns showToast function
 */

export function useToast() {
	const { showToast } = useContext(ToastContext);
	return { showToast };
}
