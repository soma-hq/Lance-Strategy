"use client";

import { createContext, useContext, useState, useCallback } from "react";

type ToastType = "success" | "error" | "warning" | "info";

interface ToastItem {
	id: number;
	message: string;
	type: ToastType;
}

interface ToastContextValue {
	toasts: ToastItem[];
	showToast: (message: string, type?: ToastType) => void;
	removeToast: (id: number) => void;
}

export const ToastContext = createContext<ToastContextValue>({
	toasts: [],
	showToast: () => {},
	removeToast: () => {},
});

let toastCounter = 0;

/**
 * Provide toast notification state to the component tree
 * @param children - Child components
 * @returns Toast context provider
 */

export function ToastProvider({ children }: { children: React.ReactNode }) {
	const [toasts, setToasts] = useState<ToastItem[]>([]);

	const removeToast = useCallback((id: number) => {
		setToasts((prev) => prev.filter((t) => t.id !== id));
	}, []);

	const showToast = useCallback(
		(message: string, type: ToastType = "success") => {
			const id = ++toastCounter;
			setToasts((prev) => [...prev, { id, message, type }]);
			// Auto-dismiss after 3500ms
			setTimeout(() => removeToast(id), 3500);
		},
		[removeToast],
	);

	return (
		<ToastContext.Provider value={{ toasts, showToast, removeToast }}>
			{children}
			<ToastContainer />
		</ToastContext.Provider>
	);
}

/**
 * Toast notification colors per type
 */

const TYPE_COLORS: Record<ToastType, string> = {
	success: "#2d7a4f",
	error: "#c0392b",
	warning: "#b8923a",
	info: "#2e4a8a",
};

const TYPE_BG: Record<ToastType, string> = {
	success: "#d6f0e2",
	error: "#fce8e6",
	warning: "rgba(184,146,58,0.12)",
	info: "rgba(46,74,138,0.1)",
};

/**
 * Render active toast notifications
 * @returns Fixed toast container
 */

function ToastContainer() {
	const { toasts, removeToast } = useContext(ToastContext);

	if (!toasts.length) return null;

	return (
		<div
			style={{
				position: "fixed",
				bottom: "24px",
				right: "24px",
				display: "flex",
				flexDirection: "column",
				gap: "10px",
				zIndex: 99999,
			}}>
			{toasts.map((t) => (
				<div
					key={t.id}
					onClick={() => removeToast(t.id)}
					style={{
						background: TYPE_BG[t.type],
						border: `1.5px solid ${TYPE_COLORS[t.type]}`,
						borderRadius: "10px",
						padding: "0.75rem 1.1rem",
						minWidth: "280px",
						maxWidth: "380px",
						display: "flex",
						alignItems: "center",
						gap: "0.6rem",
						boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
						cursor: "pointer",
						animation: "slideUp 0.25s ease",
						color: TYPE_COLORS[t.type],
						fontWeight: 600,
						fontSize: "0.875rem",
					}}>
					<span style={{ flex: 1, color: TYPE_COLORS[t.type] }}>
						{t.message}
					</span>
					<span style={{ opacity: 0.5, fontSize: "0.75rem" }}>✕</span>
				</div>
			))}
		</div>
	);
}
