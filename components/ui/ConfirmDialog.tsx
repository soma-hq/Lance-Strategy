"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { createPortal } from "react-dom";

interface ConfirmOptions {
	title: string;
	message: string;
	confirmLabel?: string;
	cancelLabel?: string;
	danger?: boolean;
}

interface ConfirmContextValue {
	confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue>({
	confirm: async () => false,
});

interface PendingConfirm {
	opts: ConfirmOptions;
	resolve: (value: boolean) => void;
}

/**
 * Provide global confirm dialog functionality
 * @param children - Child components
 * @returns Confirm context provider with dialog rendering
 */

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
	const [pending, setPending] = useState<PendingConfirm | null>(null);

	const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
		return new Promise((resolve) => {
			setPending({ opts, resolve });
		});
	}, []);

	const handleConfirm = () => {
		pending?.resolve(true);
		setPending(null);
	};

	const handleCancel = () => {
		pending?.resolve(false);
		setPending(null);
	};

	return (
		<ConfirmContext.Provider value={{ confirm }}>
			{children}
			{pending &&
				typeof document !== "undefined" &&
				createPortal(
					<div className="confirm-modal active">
						<div className="confirm-content">
							<div className="confirm-header">
								<div className="confirm-icon-wrap">
									<svg
										width="20"
										height="20"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2">
										<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
										<line x1="12" y1="9" x2="12" y2="13" />
										<line
											x1="12"
											y1="17"
											x2="12.01"
											y2="17"
										/>
									</svg>
								</div>
								<p className="confirm-title">
									{pending.opts.title}
								</p>
							</div>
							<p className="confirm-message">
								{pending.opts.message}
							</p>
							<div className="confirm-actions">
								<button
									className="btn-secondary btn-sm"
									onClick={handleCancel}>
									{pending.opts.cancelLabel || "Annuler"}
								</button>
								<button
									className={`${pending.opts.danger ? "btn-danger" : "btn-primary"} btn-sm`}
									onClick={handleConfirm}>
									{pending.opts.confirmLabel || "Confirmer"}
								</button>
							</div>
						</div>
					</div>,
					document.body,
				)}
		</ConfirmContext.Provider>
	);
}

export { ConfirmContext };
