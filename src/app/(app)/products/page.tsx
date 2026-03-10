"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import api from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { useConfirm } from "@/hooks/useConfirm";
import { hasPermission } from "@/lib/rbac";
import type { Product, UserStock } from "@/types";

interface ProductWithStock extends Product {
	totalStock: number;
	isAlert: boolean;
	stockMap: Record<string, number>;
}

/**
 * Enrich product with computed stock fields
 * @param p - Raw product from API
 * @returns Product with totalStock, isAlert, stockMap
 */

function enrich(p: Product): ProductWithStock {
	const stocks = p.stocks || [];
	const stockMap: Record<string, number> = {};
	stocks.forEach((s: UserStock) => {
		stockMap[s.username] = s.quantity;
	});
	const totalStock = stocks.reduce(
		(sum: number, s: UserStock) => sum + s.quantity,
		0,
	);
	return {
		...p,
		totalStock,
		isAlert: totalStock <= p.alertThreshold,
		stockMap,
	};
}

const INITIAL_FORM = {
	name: "",
	description: "",
	price: "",
	priceHT: "",
	sku: "",
	category: "",
	alertThreshold: "0",
};

/**
 * Products management page with table, stock management, and CRUD modals
 * @returns Products page component
 */

export default function ProductsPage() {
	const { user } = useAuth();
	const { showToast } = useToast();
	const confirm = useConfirm();

	const [products, setProducts] = useState<ProductWithStock[]>([]);
	const [filtered, setFiltered] = useState<ProductWithStock[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [filterAlert, setFilterAlert] = useState<"all" | "alert">("all");
	const [selectedProduct, setSelectedProduct] =
		useState<ProductWithStock | null>(null);
	const [showModal, setShowModal] = useState(false);
	const [editMode, setEditMode] = useState(false);
	const [form, setForm] = useState(INITIAL_FORM);
	const [saving, setSaving] = useState(false);
	const [showStockModal, setShowStockModal] = useState(false);
	const [stockUsername, setStockUsername] = useState("");
	const [stockType, setStockType] = useState<"entry" | "exit" | "set">(
		"entry",
	);
	const [stockQty, setStockQty] = useState("");
	const [stockReason, setStockReason] = useState("");
	const [ctxMenu, setCtxMenu] = useState<{
		x: number;
		y: number;
		product: ProductWithStock;
	} | null>(null);
	const canManage = user ? hasPermission(user.role, "create") : false;

	const load = useCallback(async () => {
		try {
			const data = await api.get<Product[]>("/products");
			const enriched = data.map(enrich);
			setProducts(enriched);
			setFiltered(enriched);
		} catch {
			showToast("Erreur de chargement des produits", "error");
		} finally {
			setLoading(false);
		}
	}, [showToast]);

	useEffect(() => {
		load();
	}, [load]);

	// Apply filters
	useEffect(() => {
		let result = products;
		if (search) {
			const q = search.toLowerCase();
			result = result.filter(
				(p) =>
					p.name.toLowerCase().includes(q) ||
					(p.sku || "").toLowerCase().includes(q) ||
					(p.category || "").toLowerCase().includes(q),
			);
		}
		if (filterAlert === "alert") result = result.filter((p) => p.isAlert);
		setFiltered(result);
	}, [products, search, filterAlert]);

	// Keep selectedProduct in sync when products reload (e.g. after stock update)
	useEffect(() => {
		if (!selectedProduct) return;
		const updated = products.find((p) => p.id === selectedProduct.id);
		if (updated) setSelectedProduct(updated);
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [products]);

	// Stats
	const stats = {
		total: products.length,
		totalStock: products.reduce((s, p) => s + p.totalStock, 0),
		alerts: products.filter((p) => p.isAlert).length,
		value: products.reduce((s, p) => s + p.price * p.totalStock, 0),
	};

	/**
	 * Open the create modal
	 */

	const openCreate = () => {
		setEditMode(false);
		setForm(INITIAL_FORM);
		setShowModal(true);
	};

	/**
	 * Open the edit modal for a product
	 * @param p - Product to edit
	 */

	const openEdit = (p: ProductWithStock) => {
		setEditMode(true);
		setForm({
			name: p.name,
			description: p.description || "",
			price: String(p.price),
			priceHT: String(p.priceHT),
			sku: p.sku || "",
			category: p.category || "",
			alertThreshold: String(p.alertThreshold),
		});
		setSelectedProduct(p);
		setShowModal(true);
	};

	/**
	 * Submit the create or edit form
	 */

	const handleSave = async () => {
		if (!form.name) {
			showToast("Le nom est requis", "error");
			return;
		}
		setSaving(true);
		try {
			if (editMode && selectedProduct) {
				await api.put(`/products/${selectedProduct.id}`, form);
				showToast("Produit modifié", "success");
			} else {
				await api.post("/products", form);
				showToast("Produit créé", "success");
			}
			setShowModal(false);
			load();
		} catch (e) {
			showToast((e as Error).message, "error");
		} finally {
			setSaving(false);
		}
	};

	/**
	 * Delete a product after confirmation
	 * @param p - Product to delete
	 */

	const handleDelete = async (p: ProductWithStock) => {
		const ok = await confirm({
			title: "Supprimer le produit",
			message: `Supprimer "${p.name}" ? Cette action est irréversible.`,
			confirmLabel: "Supprimer",
			danger: true,
		});
		if (!ok) return;
		try {
			await api.delete(`/products/${p.id}`);
			showToast("Produit supprimé", "success");
			setSelectedProduct(null);
			load();
		} catch (e) {
			showToast((e as Error).message, "error");
		}
	};

	/**
	 * Submit stock adjustment
	 */

	const handleStockSave = async () => {
		if (!selectedProduct || !stockUsername || !stockQty) {
			showToast("Champs requis", "error");
			return;
		}
		setSaving(true);
		try {
			await api.post(`/products/${selectedProduct.id}/stock`, {
				username: stockUsername,
				type: stockType,
				quantity: parseInt(stockQty),
				reason: stockReason,
			});
			showToast("Stock mis à jour", "success");
			setShowStockModal(false);
			load();
		} catch (e) {
			showToast((e as Error).message, "error");
		} finally {
			setSaving(false);
		}
	};

	return (
		<div onClick={() => setCtxMenu(null)}>
			{/* Page header */}
			<div className="page-header-box">
				<div className="phb-left">
					<div className="phb-icon">
						<svg
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2">
							<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
						</svg>
					</div>
					<div className="phb-text">
						<h1>Produits</h1>
						<p className="page-description">
							Gestion du catalogue et des stocks
						</p>
					</div>
				</div>
				<div className="page-header-box-actions">
					{canManage && (
						<button
							className="btn-primary btn-sm"
							onClick={openCreate}>
							<svg
								width="14"
								height="14"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2.5">
								<line x1="12" y1="5" x2="12" y2="19" />
								<line x1="5" y1="12" x2="19" y2="12" />
							</svg>
							Nouveau produit
						</button>
					)}
				</div>
			</div>

			{/* Stats */}
			<div
				className="stats-grid"
				style={{
					gridTemplateColumns: "repeat(4,1fr)",
					marginBottom: "1.25rem",
				}}>
				{[
					{
						icon: "📦",
						label: "Total produits",
						value: stats.total,
						variant: "info",
					},
					{
						icon: "📊",
						label: "Stock total",
						value: stats.totalStock,
						variant: "success",
					},
					{
						icon: "💰",
						label: "Valeur totale",
						value: `${stats.value.toFixed(0)} €`,
						variant: "primary",
					},
					{
						icon: "⚠️",
						label: "Alertes stock",
						value: stats.alerts,
						variant: "danger",
					},
				].map((s) => (
					<div key={s.label} className="stat-card">
						<div
							className={`stat-icon stat-icon-${s.variant}`}
							style={{ fontSize: "1.2rem" }}>
							{s.icon}
						</div>
						<div className="stat-info">
							<div className="stat-value">{s.value}</div>
							<div className="stat-label">{s.label}</div>
						</div>
					</div>
				))}
			</div>

			{/* Controls */}
			<div className="products-controls">
				<div
					style={{
						position: "relative",
						flex: 1,
						maxWidth: "320px",
					}}>
					<svg
						width="14"
						height="14"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						style={{
							position: "absolute",
							left: "0.75rem",
							top: "50%",
							transform: "translateY(-50%)",
							color: "var(--text-muted)",
						}}>
						<circle cx="11" cy="11" r="8" />
						<line x1="21" y1="21" x2="16.65" y2="16.65" />
					</svg>
					<input
						className="search-input"
						type="search"
						placeholder="Rechercher un produit…"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						style={{ paddingLeft: "2.25rem" }}
					/>
				</div>
				<select
					value={filterAlert}
					onChange={(e) =>
						setFilterAlert(e.target.value as "all" | "alert")
					}
					style={{
						padding: "0.6rem 0.85rem",
						border: "1.5px solid var(--border-color)",
						borderRadius: "8px",
						background: "var(--card-bg)",
						color: "var(--text)",
						fontSize: "0.875rem",
					}}>
					<option value="all">Tous les produits</option>
					<option value="alert">En alerte de stock</option>
				</select>
			</div>

			{/* Table */}
			<div className="card" style={{ padding: 0, overflow: "hidden" }}>
				{loading ? (
					<div className="empty-state">
						<p>Chargement…</p>
					</div>
				) : filtered.length === 0 ? (
					<div className="empty-state">
						<svg
							width="40"
							height="40"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="1.5">
							<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
						</svg>
						<h4>Aucun produit trouvé</h4>
						<p>Modifiez votre recherche ou ajoutez un produit</p>
					</div>
				) : (
					<div style={{ overflowX: "auto" }}>
						<table className="data-table">
							<thead>
								<tr>
									<th>Produit</th>
									<th>Catégorie</th>
									<th>Prix TTC</th>
									<th>Stock / Utilisateur</th>
									<th>Total</th>
									<th>Alerte</th>
									<th>Actions</th>
								</tr>
							</thead>
							<tbody>
								{filtered.map((p) => (
									<tr
										key={p.id}
										onClick={() => setSelectedProduct(p)}
										onContextMenu={(e) => {
											e.preventDefault();
											setCtxMenu({
												x: e.clientX,
												y: e.clientY,
												product: p,
											});
										}}
										style={{
											cursor: "pointer",
											background: p.isAlert
												? "rgba(192,57,43,0.04)"
												: undefined,
										}}>
										<td>
											<div
												style={{
													fontWeight: 600,
													color: "var(--text)",
												}}>
												{p.name}
											</div>
											{p.sku && (
												<div
													style={{
														fontSize: "0.75rem",
														color: "var(--text-muted)",
													}}>
													SKU: {p.sku}
												</div>
											)}
										</td>
										<td>
											{p.category ? (
												<span className="badge badge-info">
													{p.category}
												</span>
											) : (
												<span
													style={{
														color: "var(--text-muted)",
														fontSize: "0.8rem",
													}}>
													—
												</span>
											)}
										</td>
										<td style={{ fontWeight: 600 }}>
											{p.price.toFixed(2)} €
										</td>
										<td>
											<div
												style={{
													display: "flex",
													gap: "0.35rem",
													flexWrap: "wrap",
												}}>
												{Object.entries(p.stockMap).map(
													([username, qty]) => (
														<span
															key={username}
															className="badge badge-light"
															style={{
																fontSize:
																	"0.72rem",
															}}>
															{username}: {qty}
														</span>
													),
												)}
												{Object.keys(p.stockMap)
													.length === 0 && (
													<span
														style={{
															color: "var(--text-muted)",
															fontSize: "0.8rem",
														}}>
														0
													</span>
												)}
											</div>
										</td>
										<td
											style={{
												fontWeight: 700,
												color: p.isAlert
													? "var(--danger)"
													: "var(--text)",
											}}>
											{p.totalStock}
										</td>
										<td>
											<span
												className={`badge ${p.isAlert ? "badge-danger" : "badge-success"}`}>
												{p.isAlert
													? "⚠ Alerte"
													: "✓ OK"}
											</span>
										</td>
										<td>
											<div
												style={{
													display: "flex",
													gap: "0.4rem",
												}}>
												{canManage && (
													<>
														<button
															className="btn-icon"
															onClick={(e) => {
																e.stopPropagation();
																setSelectedProduct(
																	p,
																);
																setShowStockModal(
																	true,
																);
															}}
															title="Ajuster stock">
															<svg
																width="14"
																height="14"
																viewBox="0 0 24 24"
																fill="none"
																stroke="currentColor"
																strokeWidth="2">
																<line
																	x1="12"
																	y1="5"
																	x2="12"
																	y2="19"
																/>
																<line
																	x1="5"
																	y1="12"
																	x2="19"
																	y2="12"
																/>
															</svg>
														</button>
														<button
															className="btn-icon"
															onClick={(e) => {
																e.stopPropagation();
																openEdit(p);
															}}
															title="Modifier">
															<svg
																width="14"
																height="14"
																viewBox="0 0 24 24"
																fill="none"
																stroke="currentColor"
																strokeWidth="2">
																<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
																<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
															</svg>
														</button>
														<button
															className="btn-icon delete"
															onClick={(e) => {
																e.stopPropagation();
																handleDelete(p);
															}}
															title="Supprimer">
															<svg
																width="14"
																height="14"
																viewBox="0 0 24 24"
																fill="none"
																stroke="currentColor"
																strokeWidth="2">
																<polyline points="3 6 5 6 21 6" />
																<path d="M19 6l-1 14H6L5 6" />
																<path d="M10 11v6M14 11v6" />
															</svg>
														</button>
													</>
												)}
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>

			{/* Context menu */}
			{ctxMenu && (
				<div
					className="ctx-menu"
					style={{
						position: "fixed",
						left: ctxMenu.x,
						top: ctxMenu.y,
						zIndex: 9999,
					}}>
					<div
						className="ctx-item"
						onClick={() => {
							setSelectedProduct(ctxMenu.product);
							setCtxMenu(null);
						}}>
						<svg
							className="ctx-icon"
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2">
							<circle cx="12" cy="12" r="10" />
							<line x1="12" y1="8" x2="12" y2="12" />
							<line x1="12" y1="16" x2="12.01" y2="16" />
						</svg>
						Voir détails
					</div>
					{canManage && (
						<>
							<div
								className="ctx-item"
								onClick={() => {
									setSelectedProduct(ctxMenu.product);
									setShowStockModal(true);
									setCtxMenu(null);
								}}>
								<svg
									className="ctx-icon"
									width="14"
									height="14"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2">
									<line x1="12" y1="5" x2="12" y2="19" />
									<line x1="5" y1="12" x2="19" y2="12" />
								</svg>
								Modifier stock
							</div>
							<div
								className="ctx-item"
								onClick={() => {
									openEdit(ctxMenu.product);
									setCtxMenu(null);
								}}>
								<svg
									className="ctx-icon"
									width="14"
									height="14"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2">
									<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
									<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
								</svg>
								Modifier
							</div>
							<div className="ctx-divider" />
							<div
								className="ctx-item danger"
								onClick={() => {
									handleDelete(ctxMenu.product);
									setCtxMenu(null);
								}}>
								<svg
									className="ctx-icon"
									width="14"
									height="14"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2">
									<polyline points="3 6 5 6 21 6" />
									<path d="M19 6l-1 14H6L5 6" />
								</svg>
								Supprimer
							</div>
						</>
					)}
				</div>
			)}

			{/* Product detail panel */}
			{selectedProduct && !showModal && !showStockModal && (
				<div
					className="modal-overlay"
					onClick={() => setSelectedProduct(null)}>
					<div
						className="modal-content modal-large"
						onClick={(e) => e.stopPropagation()}>
						<div className="modal-header">
							<h3>{selectedProduct.name}</h3>
							<button
								className="btn-icon"
								onClick={() => setSelectedProduct(null)}>
								<svg
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2">
									<line x1="18" y1="6" x2="6" y2="18" />
									<line x1="6" y1="6" x2="18" y2="18" />
								</svg>
							</button>
						</div>
						<div className="modal-body">
							{/* Product info */}
							<div
								style={{
									display: "grid",
									gridTemplateColumns: "1fr 1fr",
									gap: "0.5rem 1.25rem",
									marginBottom: "1.25rem",
								}}>
								{[
									{
										label: "SKU",
										value: selectedProduct.sku || "—",
									},
									{
										label: "Catégorie",
										value: selectedProduct.category || "—",
									},
									{
										label: "Prix TTC",
										value: `${selectedProduct.price.toFixed(2)} €`,
									},
									{
										label: "Prix HT",
										value: `${selectedProduct.priceHT.toFixed(2)} €`,
									},
									{
										label: "Seuil alerte",
										value: selectedProduct.alertThreshold,
									},
									{
										label: "Stock total",
										value: selectedProduct.totalStock,
									},
								].map((item) => (
									<div key={item.label}>
										<div
											style={{
												fontSize: "0.72rem",
												fontWeight: 700,
												color: "var(--text-muted)",
												textTransform: "uppercase",
												letterSpacing: "0.05em",
												marginBottom: "0.2rem",
											}}>
											{item.label}
										</div>
										<div
											style={{
												fontSize: "0.9rem",
												fontWeight: 600,
												color: "var(--text)",
											}}>
											{item.value}
										</div>
									</div>
								))}
							</div>

							{/* Stock per user */}
							<h4
								style={{
									fontSize: "0.85rem",
									fontWeight: 700,
									marginBottom: "0.75rem",
									color: "var(--text)",
								}}>
								Stock par utilisateur
							</h4>
							<div
								style={{
									display: "flex",
									flexWrap: "wrap",
									gap: "0.5rem",
									marginBottom: "1.25rem",
								}}>
								{Object.entries(selectedProduct.stockMap)
									.length === 0 ? (
									<span
										style={{
											color: "var(--text-muted)",
											fontSize: "0.85rem",
										}}>
										Aucun stock enregistré
									</span>
								) : (
									Object.entries(
										selectedProduct.stockMap,
									).map(([username, qty]) => (
										<div
											key={username}
											style={{
												padding: "0.4rem 0.8rem",
												background: "var(--bg-alt)",
												border: "1.5px solid var(--border-color)",
												borderRadius: "8px",
												fontSize: "0.85rem",
												fontWeight: 600,
											}}>
											{username}:{" "}
											<span
												style={{
													color: "var(--accent)",
												}}>
												{qty}
											</span>
										</div>
									))
								)}
							</div>

							{/* Stock history */}
							<h4
								style={{
									fontSize: "0.85rem",
									fontWeight: 700,
									marginBottom: "0.75rem",
									color: "var(--text)",
								}}>
								Historique stock (20 derniers)
							</h4>
							{!selectedProduct.stockHistory ||
							selectedProduct.stockHistory.length === 0 ? (
								<p
									style={{
										color: "var(--text-muted)",
										fontSize: "0.85rem",
									}}>
									Aucun historique
								</p>
							) : (
								<div style={{ overflowX: "auto" }}>
									<table className="data-table">
										<thead>
											<tr>
												<th>Date</th>
												<th>Type</th>
												<th>Qté</th>
												<th>Avant → Après</th>
												<th>Par</th>
												<th>Raison</th>
											</tr>
										</thead>
										<tbody>
											{selectedProduct.stockHistory
												.slice(0, 20)
												.map((h) => (
													<tr key={h.id}>
														<td
															style={{
																fontSize:
																	"0.78rem",
															}}>
															{new Date(
																h.date,
															).toLocaleDateString(
																"fr-FR",
															)}
														</td>
														<td>
															<span
																className={`badge ${h.type === "entry" ? "badge-success" : h.type === "exit" ? "badge-danger" : "badge-info"}`}>
																{h.type}
															</span>
														</td>
														<td
															style={{
																fontWeight: 600,
															}}>
															{h.quantity}
														</td>
														<td
															style={{
																fontSize:
																	"0.82rem",
																color: "var(--text-muted)",
															}}>
															{h.stockBefore} →{" "}
															{h.stockAfter}
														</td>
														<td
															style={{
																fontSize:
																	"0.82rem",
															}}>
															{h.user?.name || "—"}
														</td>
														<td
															style={{
																fontSize:
																	"0.78rem",
																color: "var(--text-muted)",
															}}>
															{h.reason || "—"}
														</td>
													</tr>
												))}
										</tbody>
									</table>
								</div>
							)}
						</div>
						{canManage && (
							<div className="modal-footer">
								<button
									className="btn-secondary btn-sm"
									onClick={() => {
										setShowStockModal(true);
									}}>
									Ajuster stock
								</button>
								<button
									className="btn-edit btn-sm"
									onClick={() => openEdit(selectedProduct)}>
									Modifier
								</button>
								<button
									className="btn-danger btn-sm"
									onClick={() =>
										handleDelete(selectedProduct)
									}>
									Supprimer
								</button>
							</div>
						)}
					</div>
				</div>
			)}

			{/* Create / Edit modal */}
			{showModal && (
				<div className="modal-overlay">
					<div className="modal-content">
						<div className="modal-header">
							<h3>
								{editMode
									? "Modifier le produit"
									: "Nouveau produit"}
							</h3>
							<button
								className="btn-icon"
								onClick={() => setShowModal(false)}>
								<svg
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2">
									<line x1="18" y1="6" x2="6" y2="18" />
									<line x1="6" y1="6" x2="18" y2="18" />
								</svg>
							</button>
						</div>
						<div
							className="modal-body"
							style={{
								display: "grid",
								gridTemplateColumns: "1fr 1fr",
								gap: "0.75rem",
							}}>
							<div
								className="form-group"
								style={{ gridColumn: "1 / -1", margin: 0 }}>
								<label>Nom *</label>
								<input
									value={form.name}
									onChange={(e) =>
										setForm({
											...form,
											name: e.target.value,
										})
									}
									placeholder="Nom du produit"
								/>
							</div>
							<div
								className="form-group"
								style={{ gridColumn: "1 / -1", margin: 0 }}>
								<label>Description</label>
								<textarea
									value={form.description}
									onChange={(e) =>
										setForm({
											...form,
											description: e.target.value,
										})
									}
									rows={2}
									placeholder="Description…"
								/>
							</div>
							<div className="form-group" style={{ margin: 0 }}>
								<label>Prix TTC (€)</label>
								<input
									type="number"
									step="0.01"
									value={form.price}
									onChange={(e) =>
										setForm({
											...form,
											price: e.target.value,
										})
									}
									placeholder="0.00"
								/>
							</div>
							<div className="form-group" style={{ margin: 0 }}>
								<label>Prix HT (€)</label>
								<input
									type="number"
									step="0.01"
									value={form.priceHT}
									onChange={(e) =>
										setForm({
											...form,
											priceHT: e.target.value,
										})
									}
									placeholder="0.00"
								/>
							</div>
							<div className="form-group" style={{ margin: 0 }}>
								<label>SKU</label>
								<input
									value={form.sku}
									onChange={(e) =>
										setForm({
											...form,
											sku: e.target.value,
										})
									}
									placeholder="REF-001"
								/>
							</div>
							<div className="form-group" style={{ margin: 0 }}>
								<label>Catégorie</label>
								<input
									value={form.category}
									onChange={(e) =>
										setForm({
											...form,
											category: e.target.value,
										})
									}
									placeholder="Ex: Bijoux"
								/>
							</div>
							<div className="form-group" style={{ margin: 0 }}>
								<label>Seuil d&apos;alerte stock</label>
								<input
									type="number"
									value={form.alertThreshold}
									onChange={(e) =>
										setForm({
											...form,
											alertThreshold: e.target.value,
										})
									}
									placeholder="0"
								/>
							</div>
						</div>
						<div className="modal-footer">
							<button
								className="btn-secondary btn-sm"
								onClick={() => setShowModal(false)}>
								Annuler
							</button>
							<button
								className="btn-primary btn-sm"
								onClick={handleSave}
								disabled={saving}>
								{saving
									? "Enregistrement…"
									: editMode
										? "Modifier"
										: "Créer"}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Stock adjustment modal */}
			{showStockModal && selectedProduct && (
				<div className="modal-overlay">
					<div className="modal-content">
						<div className="modal-header">
							<h3>Ajuster stock — {selectedProduct.name}</h3>
							<button
								className="btn-icon"
								onClick={() => setShowStockModal(false)}>
								<svg
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2">
									<line x1="18" y1="6" x2="6" y2="18" />
									<line x1="6" y1="6" x2="18" y2="18" />
								</svg>
							</button>
						</div>
						<div className="modal-body">
							<div className="form-group">
								<label>Utilisateur</label>
								<input
									value={stockUsername}
									onChange={(e) =>
										setStockUsername(e.target.value)
									}
									placeholder="nom_utilisateur"
								/>
							</div>
							<div className="form-group">
								<label>Type d&apos;opération</label>
								<select
									value={stockType}
									onChange={(e) =>
										setStockType(
											e.target.value as
												| "entry"
												| "exit"
												| "set",
										)
									}>
									<option value="entry">
										Entrée de stock (+)
									</option>
									<option value="exit">
										Sortie de stock (-)
									</option>
									<option value="set">
										Définir la valeur
									</option>
								</select>
							</div>
							<div className="form-group">
								<label>Quantité</label>
								<input
									type="number"
									value={stockQty}
									onChange={(e) =>
										setStockQty(e.target.value)
									}
									placeholder="0"
									min="0"
								/>
							</div>
							<div className="form-group">
								<label>Raison (optionnel)</label>
								<input
									value={stockReason}
									onChange={(e) =>
										setStockReason(e.target.value)
									}
									placeholder="Motif de l'ajustement"
								/>
							</div>
						</div>
						<div className="modal-footer">
							<button
								className="btn-secondary btn-sm"
								onClick={() => setShowStockModal(false)}>
								Annuler
							</button>
							<button
								className="btn-primary btn-sm"
								onClick={handleStockSave}
								disabled={saving}>
								{saving ? "Enregistrement…" : "Appliquer"}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
