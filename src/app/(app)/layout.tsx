"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Sidebar } from "@/components/layout/Sidebar";

/**
 * Authenticated application shell with sidebar
 * @param children - Page content
 * @returns App layout with auth guard
 */

export default function AppLayout({ children }: { children: React.ReactNode }) {
	const { user, loading } = useAuth();
	const router = useRouter();

	useEffect(() => {
		if (!loading && !user) {
			router.push("/login");
		}
	}, [user, loading, router]);

	if (loading) {
		return (
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					minHeight: "100vh",
					background: "var(--bg)",
				}}>
				<div
					style={{
						width: "36px",
						height: "36px",
						border: "3px solid var(--border-color)",
						borderTopColor: "var(--accent)",
						borderRadius: "50%",
						animation: "spin 0.7s linear infinite",
					}}
				/>
				<style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
			</div>
		);
	}

	if (!user) return null;

	return (
		<div className="app-container">
			<Sidebar />
			<main
				className="main-content"
				style={{
					marginLeft: "268px",
					flex: 1,
					display: "flex",
					flexDirection: "column",
					minHeight: "100vh",
				}}>
				<div
					id="content"
					style={{ flex: 1, padding: "1.5rem 1.75rem" }}>
					{children}
				</div>
			</main>
		</div>
	);
}
