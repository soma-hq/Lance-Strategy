"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/hooks/useAuth";

/**
 * Login page with username and password form
 * @returns Login page
 */

export default function LoginPage() {
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const { showToast } = useToast();
	const { refresh, user } = useAuth();
	const router = useRouter();

	// Already logged in
	useEffect(() => {
		if (user) router.push("/dashboard");
	}, [user, router]);

	/**
	 * Handle form submission
	 * @param e - Form event
	 */

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setLoading(true);

		try {
			const res = await fetch("/api/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({ username, password }),
			});

			if (!res.ok) {
				const data = await res.json();
				setError(data.error || "Identifiants incorrects");
				setLoading(false);
				return;
			}

			// Refresh auth context
			await refresh();
			showToast("Connexion réussie !", "success");
			router.push("/dashboard");
		} catch {
			setError("Erreur de connexion au serveur");
			setLoading(false);
		}
	};

	return (
		<div
			style={{
				minHeight: "100vh",
				background: "var(--bg)",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				padding: "1.5rem",
			}}>
			<div
				style={{
					background: "var(--card-bg)",
					border: "1.5px solid var(--border-color)",
					borderRadius: "20px",
					padding: "2.5rem",
					width: "100%",
					maxWidth: "420px",
					boxShadow: "0 16px 48px rgba(0,0,0,0.12)",
				}}>
				{/* Brand header */}
				<div style={{ textAlign: "center", marginBottom: "2rem" }}>
					<div
						style={{
							width: "56px",
							height: "56px",
							background:
								"linear-gradient(135deg, #2e4a8a, #3a5491)",
							borderRadius: "16px",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							margin: "0 auto 1rem",
							boxShadow: "0 6px 20px rgba(46,74,138,0.25)",
						}}>
						<span
							style={{
								fontFamily: "var(--font-manrope, Manrope)",
								fontWeight: 800,
								fontSize: "1.5rem",
								color: "#b8923a",
							}}>
							L
						</span>
					</div>
					<h1
						style={{
							fontFamily: "var(--font-manrope, Manrope)",
							fontSize: "1.6rem",
							fontWeight: 800,
							color: "var(--text)",
							margin: 0,
							lineHeight: 1.2,
						}}>
						<span style={{ color: "#b8923a" }}>Lance</span>{" "}
						<span style={{ color: "#2e4a8a" }}>Strategy</span>
					</h1>
					<p
						style={{
							fontSize: "0.85rem",
							color: "var(--text-muted)",
							marginTop: "0.4rem",
						}}>
						Connectez-vous à votre espace
					</p>
				</div>

				{/* Error message */}
				{error && (
					<div
						style={{
							background: "var(--danger-light)",
							border: "1.5px solid var(--danger)",
							borderRadius: "8px",
							padding: "0.75rem 1rem",
							marginBottom: "1.25rem",
							color: "var(--danger)",
							fontSize: "0.875rem",
							fontWeight: 500,
						}}>
						{error}
					</div>
				)}

				{/* Login form */}
				<form
					onSubmit={handleSubmit}
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "1rem",
					}}>
					<div className="form-group" style={{ margin: 0 }}>
						<label>Nom d&apos;utilisateur</label>
						<input
							type="text"
							value={username}
							onChange={(e) => setUsername(e.target.value)}
							placeholder="admin"
							required
							autoFocus
							autoComplete="username"
						/>
					</div>

					<div className="form-group" style={{ margin: 0 }}>
						<label>Mot de passe</label>
						<input
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							placeholder="••••••••"
							required
							autoComplete="current-password"
						/>
					</div>

					<button
						type="submit"
						className="btn-primary"
						disabled={loading}
						style={{
							width: "100%",
							justifyContent: "center",
							padding: "0.75rem",
							marginTop: "0.5rem",
							fontSize: "0.95rem",
							opacity: loading ? 0.7 : 1,
							cursor: loading ? "wait" : "pointer",
						}}>
						{loading ? (
							<>
								<svg
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2.5"
									style={{
										animation: "spin 0.7s linear infinite",
									}}>
									<path
										d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"
										opacity=".2"
									/>
									<path d="M21 12a9 9 0 0 0-9-9" />
								</svg>
								Connexion…
							</>
						) : (
							"Se connecter"
						)}
					</button>
				</form>

				<p
					style={{
						textAlign: "center",
						fontSize: "0.75rem",
						color: "var(--text-muted)",
						marginTop: "1.5rem",
						marginBottom: 0,
					}}>
					Lance Strategy © {new Date().getFullYear()}
				</p>
			</div>
			<style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
		</div>
	);
}
