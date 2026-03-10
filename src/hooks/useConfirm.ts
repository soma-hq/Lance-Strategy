"use client";

import { useContext } from "react";
import { ConfirmContext } from "@/components/ui/ConfirmDialog";

/**
 * Get the confirm dialog function
 * @returns confirm function that returns a Promise<boolean>
 */

export function useConfirm() {
	const { confirm } = useContext(ConfirmContext);
	return confirm;
}
