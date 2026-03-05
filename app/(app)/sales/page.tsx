"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { useConfirm } from "@/hooks/useConfirm";
import type { Sale, Product, Client, User } from "@/types";

const TVA_RATE = 0.2;

const STATUS_LABEL: Record<string, string> = {
	postponed: "En attente",
	completed: "Complétée",
	cancelled: "Annulée",
};
const STATUS_BADGE: Record<string, string> = {
	postponed: "badge-warning",
	completed: "badge-success",
	cancelled: "badge-danger",
};

// Static platform list — auto-selects "Direct" when a client is chosen
const PLATFORMS = ["", "Direct", "Amazon", "Cdiscount", "Etsy", "eBay", "Autre"];

interface LineItem {
	id: string;
	productId: string;
	quantity: number;
	unitPriceTTC: number;
}

const INITIAL_FORM = {
	clientId: "",
	sellerId: "",
	status: "completed" as Sale["status"],
	platform: "",
	notes: "",
	date: new Date().toISOString().slice(0, 10),
};

/**
 * Format a number as Euro currency string
 * @param n - Amount to format
 * @returns Formatted string like "1 234,56 €"
 */
function eur(n: number): string {
	return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2 });
}

/**
 * Format a date value to French locale short date
 * @param d - ISO string or Date object
 * @returns Formatted date string "dd/mm/yyyy"
 */
function formatDate(d: string | Date): string {
	return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/**
 * Generate a short random unique ID
 * @returns 7-character alphanumeric string
 */
function uid(): string {
	return Math.random().toString(36).slice(2, 9);
}

// Invoice preview component types
interface PreviewProps {
	form: typeof INITIAL_FORM;
	lines: LineItem[];
	products: Product[];
	client: { name?: string; company?: string | null } | undefined;
	seller: { name?: string } | undefined;
}

/**
 * Invoice preview card rendered from current form state
 * @param form - Current sale form values
 * @param lines - Line items list
 * @param products - Full products catalogue for lookups
 * @param client - Selected client (partial)
 * @param seller - Selected seller (partial)
 * @returns Invoice preview JSX or empty state placeholder
 */
function InvoicePreview({ form, lines, products, client, seller }: PreviewProps) {
	const validLines = lines.filter((l) => l.productId);
	const hasContent = validLines.length > 0 || seller;

	// Compute per-line totals
	const lineDetails = validLines.map((l) => {
		const product = products.find((p) => String(p.id) === l.productId);
		const ttc = l.quantity * l.unitPriceTTC;
		const ht = ttc / (1 + TVA_RATE);
		return { ...l, product, ttc, ht, tva: ttc - ht };
	});

	// Global totals
	const totalTTC = lineDetails.reduce((s, l) => s + l.ttc, 0);
	const totalHT = lineDetails.reduce((s, l) => s + l.ht, 0);
	const totalTVA = totalTTC - totalHT;

	if (!hasContent) {
		return (
			<div style={{
				flex: 1, border: "2px dashed var(--border-color)", borderRadius: "10px",
				display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
				gap: "0.75rem", padding: "2rem", color: "var(--text-muted)", minHeight: "380px",
			}}>
				<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
					<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
					<polyline points="14 2 14 8 20 8" />
					<line x1="8" y1="13" x2="16" y2="13" />
					<line x1="8" y1="17" x2="16" y2="17" />
				</svg>
				<p style={{ fontSize: "0.88rem", textAlign: "center" }}>
					Ajoutez des produits et un vendeur<br />pour afficher l&apos;aperçu de la facture
				</p>
			</div>
		);
	}

	return (
		<div style={{ flex: 1, border: "1.5px solid var(--border-color)", borderRadius: "10px", overflow: "hidden", fontSize: "0.78rem", display: "flex", flexDirection: "column" }}>
			{/* Invoice header */}
			<div style={{ background: "var(--sidebar-bg, #1a2744)", padding: "1rem 1.1rem", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
				<div>
					<div style={{ fontFamily: "var(--font-cinzel, Cinzel, serif)", fontWeight: 700, fontSize: "1rem", color: "#b8923a" }}>LANCE STRATEGY</div>
					<div style={{ opacity: 0.55, fontSize: "0.7rem", marginTop: "2px" }}>Aperçu facture</div>
				</div>
				<div style={{ textAlign: "right", opacity: 0.8, fontSize: "0.72rem" }}>
					<div style={{ color: "#b8923a", fontWeight: 700, fontSize: "0.9rem" }}>FACTURE</div>
					<div>{formatDate(form.date || new Date())}</div>
				</div>
			</div>

			{/* Invoice body */}
			<div style={{ padding: "0.85rem 1.1rem", flex: 1, display: "flex", flexDirection: "column", gap: "0.85rem" }}>
				{/* Parties */}
				<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
					<div style={{ background: "var(--bg-alt)", borderRadius: "6px", padding: "0.65rem" }}>
						<div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.3rem" }}>Facturé à</div>
						<div style={{ fontWeight: 700, color: "var(--text)" }}>{client?.name || "— Sans client —"}</div>
						{client?.company && <div style={{ color: "var(--text-muted)" }}>{client.company}</div>}
					</div>
					<div style={{ background: "var(--bg-alt)", borderRadius: "6px", padding: "0.65rem" }}>
						<div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.3rem" }}>Vendeur</div>
						<div style={{ fontWeight: 700, color: "var(--text)" }}>{seller?.name || "—"}</div>
						{form.platform && <div style={{ color: "var(--text-muted)" }}>via {form.platform}</div>}
					</div>
				</div>

				{/* Items table */}
				<div style={{ border: "1px solid var(--border-color)", borderRadius: "6px", overflow: "hidden" }}>
					<div style={{ background: "var(--sidebar-bg, #1a2744)", color: "#fff", display: "grid", gridTemplateColumns: "1fr 40px 80px 80px", gap: "0.5rem", padding: "0.45rem 0.65rem", fontSize: "0.68rem", fontWeight: 700, opacity: 0.9 }}>
						<span>Désignation</span>
						<span style={{ textAlign: "center" }}>Qté</span>
						<span style={{ textAlign: "right" }}>P.U. TTC</span>
						<span style={{ textAlign: "right" }}>Total TTC</span>
					</div>
					{lineDetails.map((line, i) => (
						<div key={line.id} style={{
							background: "var(--card-bg)", display: "grid", gridTemplateColumns: "1fr 40px 80px 80px",
							gap: "0.5rem", padding: "0.55rem 0.65rem", alignItems: "center",
							borderTop: i > 0 ? "1px solid var(--border-color)" : "none",
						}}>
							<span style={{ fontWeight: 600, color: "var(--text)" }}>{line.product?.name || "—"}</span>
							<span style={{ textAlign: "center", color: "var(--text-muted)" }}>{line.quantity}</span>
							<span style={{ textAlign: "right", color: "var(--text-muted)" }}>{eur(line.unitPriceTTC)}</span>
							<span style={{ textAlign: "right", fontWeight: 700, color: "var(--accent)" }}>{eur(line.ttc)}</span>
						</div>
					))}
					{validLines.length === 0 && (
						<div style={{ padding: "0.75rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.78rem" }}>
							Aucun produit ajouté
						</div>
					)}
				</div>

				{/* TVA breakdown */}
				<div style={{ marginLeft: "auto", width: "220px", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
					<div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)" }}>
						<span>Sous-total HT</span><span>{eur(totalHT)}</span>
					</div>
					<div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)" }}>
						<span>TVA (20 %)</span><span>{eur(totalTVA)}</span>
					</div>
					<div style={{ height: "1px", background: "var(--border-color)", margin: "0.25rem 0" }} />
					<div style={{
						display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: "0.9rem",
						background: "var(--sidebar-bg, #1a2744)", color: "#b8923a",
						padding: "0.4rem 0.6rem", borderRadius: "5px",
					}}>
						<span>TOTAL TTC</span><span>{eur(totalTTC)}</span>
					</div>
				</div>

				{/* Legal mentions */}
				<div style={{ marginTop: "auto", paddingTop: "0.5rem", borderTop: "1px solid var(--border-color)", color: "var(--text-muted)", fontSize: "0.68rem", lineHeight: 1.5 }}>
					TVA non récupérable. Paiement à réception de facture.
					Pénalités de retard au taux légal en vigueur.
				</div>
			</div>
		</div>
	);
}

// Sale detail modal props
interface SaleDetailModalProps {
	sale: Sale;
	products: Product[];
	onClose: () => void;
	onDownload: (sale: Sale) => void;
}

/**
 * Full detail modal shown when clicking a sale row
 * @param sale - Sale to display
 * @param products - Full products list for invoice preview lookup
 * @param onClose - Close callback
 * @param onDownload - Download invoice callback
 * @returns Detail modal JSX
 */
function SaleDetailModal({ sale, products, onClose, onDownload }: SaleDetailModalProps) {
	// Reconstruct preview form from saved sale
	const previewForm = {
		clientId: String(sale.clientId ?? ""),
		sellerId: String(sale.sellerId),
		status: sale.status,
		platform: sale.platform || "",
		notes: "",
		date: new Date(sale.date).toISOString().slice(0, 10),
	};

	// Single line from the sale record
	const previewLines: LineItem[] = [{
		id: "detail-0",
		productId: String(sale.productId),
		quantity: sale.quantity,
		unitPriceTTC: sale.unitPriceTTC,
	}];

	const totalHT = sale.totalHT ?? sale.totalTTC / (1 + TVA_RATE);

	return (
		<div className="modal-overlay">
			<div className="modal-content" style={{ maxWidth: "860px", width: "96vw" }}>

				{/* Modal header */}
				<div className="modal-header">
					<h3>Détail de la vente #{sale.id}</h3>
					<button className="btn-icon" onClick={onClose}>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
							<line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
						</svg>
					</button>
				</div>

				<div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
					{/* Key info grid */}
					<div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
						{/* Client info */}
						<div style={{ background: "var(--bg-alt)", borderRadius: "8px", padding: "0.75rem" }}>
							<div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.35rem" }}>Client</div>
							<div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{sale.client?.name || "—"}</div>
						</div>
						{/* Seller info */}
						<div style={{ background: "var(--bg-alt)", borderRadius: "8px", padding: "0.75rem" }}>
							<div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.35rem" }}>Vendeur</div>
							<div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{sale.seller?.name || "—"}</div>
						</div>
						{/* Status & platform */}
						<div style={{ background: "var(--bg-alt)", borderRadius: "8px", padding: "0.75rem" }}>
							<div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.35rem" }}>Statut / Plateforme</div>
							<div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
								<span className={`badge ${STATUS_BADGE[sale.status]}`} style={{ fontSize: "0.72rem" }}>{STATUS_LABEL[sale.status]}</span>
								{sale.platform && <span className="badge badge-light" style={{ fontSize: "0.72rem" }}>{sale.platform}</span>}
							</div>
						</div>
					</div>

					{/* Product & price row */}
					<div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem" }}>
						<div style={{ background: "var(--bg-alt)", borderRadius: "8px", padding: "0.75rem" }}>
							<div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.35rem" }}>Produit</div>
							<div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{sale.product?.name || "—"}</div>
						</div>
						<div style={{ background: "var(--bg-alt)", borderRadius: "8px", padding: "0.75rem" }}>
							<div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.35rem" }}>Quantité</div>
							<div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{sale.quantity}</div>
						</div>
						<div style={{ background: "var(--bg-alt)", borderRadius: "8px", padding: "0.75rem" }}>
							<div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.35rem" }}>Prix unitaire HT</div>
							<div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{eur(sale.unitPriceHT ?? sale.unitPriceTTC / (1 + TVA_RATE))}</div>
						</div>
						<div style={{ background: "var(--bg-alt)", borderRadius: "8px", padding: "0.75rem" }}>
							<div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.35rem" }}>Total TTC</div>
							<div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--accent)" }}>{eur(sale.totalTTC)}</div>
						</div>
					</div>

					{/* Date & total HT */}
					<div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.75rem" }}>
						<div style={{ background: "var(--bg-alt)", borderRadius: "8px", padding: "0.75rem" }}>
							<div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.35rem" }}>Date</div>
							<div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{formatDate(sale.date)}</div>
						</div>
						<div style={{ background: "var(--bg-alt)", borderRadius: "8px", padding: "0.75rem" }}>
							<div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.35rem" }}>Total HT</div>
							<div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{eur(totalHT)}</div>
						</div>
					</div>

					{/* Invoice preview */}
					<div>
						<div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.6rem" }}>
							Aperçu facture
						</div>
						<InvoicePreview
							form={previewForm}
							lines={previewLines}
							products={products}
							client={sale.client ?? undefined}
							seller={sale.seller}
						/>
					</div>
				</div>

				<div className="modal-footer">
					<button className="btn-secondary btn-sm" onClick={onClose}>Fermer</button>
					{/* Download button */}
					<button className="btn-primary btn-sm" onClick={() => onDownload(sale)}>
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
							<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
							<polyline points="14 2 14 8 20 8" />
							<line x1="12" y1="13" x2="12" y2="19" />
							<polyline points="9 16 12 19 15 16" />
						</svg>
						Télécharger la facture
					</button>
				</div>
			</div>
		</div>
	);
}

// Pagination controls reused at top and bottom of the table
interface PaginationProps {
	page: number;
	totalPages: number;
	onPage: (p: number) => void;
}

/**
 * Prev / Next pagination bar
 * @param page - Current page (1-indexed)
 * @param totalPages - Total number of pages
 * @param onPage - Page change callback
 * @returns Pagination JSX or null when only one page
 */
function Pagination({ page, totalPages, onPage }: PaginationProps) {
	if (totalPages <= 1) return null;

	return (
		<div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem" }}>
			<button className="btn-secondary btn-sm" onClick={() => onPage(1)} disabled={page === 1}>«</button>
			<button className="btn-secondary btn-sm" onClick={() => onPage(Math.max(1, page - 1))} disabled={page === 1}>‹</button>
			<span style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
				Page <strong>{page}</strong> / {totalPages}
			</span>
			<button className="btn-secondary btn-sm" onClick={() => onPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}>›</button>
			<button className="btn-secondary btn-sm" onClick={() => onPage(totalPages)} disabled={page === totalPages}>»</button>
		</div>
	);
}

/**
 * Sales management page
 * @returns Full sales page JSX
 */
export default function SalesPage() {
	const { user } = useAuth();
	const { showToast } = useToast();
	const confirm = useConfirm();

	// Data state
	const [sales, setSales] = useState<Sale[]>([]);
	const [products, setProducts] = useState<Product[]>([]);
	const [clients, setClients] = useState<Client[]>([]);
	const [users, setUsers] = useState<User[]>([]);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(1);
	const [loading, setLoading] = useState(true);

	// Filter state
	const [search, setSearch] = useState("");
	const [filterStatus, setFilterStatus] = useState("");
	const [filterPlatform, setFilterPlatform] = useState("");
	const [dateFrom, setDateFrom] = useState("");
	const [dateTo, setDateTo] = useState("");

	// Create/edit modal state
	const [showModal, setShowModal] = useState(false);
	const [editMode, setEditMode] = useState(false);
	const [editTarget, setEditTarget] = useState<Sale | null>(null);
	const [form, setForm] = useState(INITIAL_FORM);
	const [lines, setLines] = useState<LineItem[]>([{ id: uid(), productId: "", quantity: 1, unitPriceTTC: 0 }]);
	const [saving, setSaving] = useState(false);
	const [createdSales, setCreatedSales] = useState<Sale[]>([]);

	// Tab state for the creation form (Global = form, Facture = invoice preview)
	const [formTab, setFormTab] = useState<"global" | "facture">("global");

	// Tab state shown after successful creation
	const [modalTab, setModalTab] = useState<"facture" | "logs">("facture");

	// Row detail modal state
	const [detailSale, setDetailSale] = useState<Sale | null>(null);

	// 5 items per page
	const limit = 5;

	/**
	 * Load paginated sales from the API
	 * @returns void
	 */
	const load = useCallback(async () => {
		setLoading(true);
		try {
			const params = new URLSearchParams();
			if (filterStatus) params.set("status", filterStatus);
			if (dateFrom) params.set("from", dateFrom);
			if (dateTo) params.set("to", dateTo);
			params.set("page", String(page));
			params.set("limit", String(limit));
			const data = await api.get<{ sales: Sale[]; total: number }>(`/sales?${params}`);
			setSales(data.sales);
			setTotal(data.total);
		} catch {
			showToast("Erreur de chargement", "error");
		} finally {
			setLoading(false);
		}
	}, [filterStatus, dateFrom, dateTo, page, showToast]);

	/**
	 * Load reference data (products, clients, users) in parallel
	 * @returns void
	 */
	const loadRefs = useCallback(async () => {
		try {
			const [p, c, u] = await Promise.all([
				api.get<Product[]>("/products"),
				api.get<Client[]>("/clients"),
				api.get<User[]>("/users"),
			]);
			setProducts(p);
			setClients(c);
			setUsers(u);
		} catch { /* silent */ }
	}, []);

	useEffect(() => { loadRefs(); }, [loadRefs]);
	useEffect(() => { load(); }, [load]);

	const totalPages = Math.ceil(total / limit);

	// Derived stats for the stats bar
	const completedSales = sales.filter((s) => s.status === "completed");
	const pendingSales = sales.filter((s) => s.status === "postponed");
	const totalRevenue = completedSales.reduce((sum, s) => sum + s.totalTTC, 0);

	// Client-side search and platform filter
	const displayed = search
		? sales.filter((s) =>
			s.product?.name.toLowerCase().includes(search.toLowerCase()) ||
			s.client?.name?.toLowerCase().includes(search.toLowerCase()) ||
			s.seller?.name?.toLowerCase().includes(search.toLowerCase()),
		)
		: sales;

	const filtered = filterPlatform
		? displayed.filter((s) => s.platform === filterPlatform)
		: displayed;

	// Line items total helpers
	const linesTotal = lines.reduce((s, l) => s + l.quantity * l.unitPriceTTC, 0);
	const linesTotalHT = linesTotal / (1 + TVA_RATE);
	const linesTotalTVA = linesTotal - linesTotalHT;

	const selectedClient = clients.find((c) => String(c.id) === form.clientId);
	const selectedSeller = users.find((u) => String(u.id) === form.sellerId);

	/**
	 * Get total available stock for a product
	 * @param productId - Product ID as string
	 * @returns Total stock quantity, or Infinity if no stock data present
	 */
	const getAvailableStock = (productId: string): number => {
		const product = products.find((p) => String(p.id) === productId);
		if (!product?.stocks) return Infinity;
		return product.stocks.reduce((s, st) => s + st.quantity, 0);
	};

	// True when any line item exceeds available stock — blocks save button
	const hasStockError = lines.some((l) => {
		if (!l.productId) return false;
		const available = getAvailableStock(l.productId);
		return l.quantity > available;
	});

	/**
	 * Add a blank line item row to the form
	 * @returns void
	 */
	const addLine = () => {
		setLines((prev) => [...prev, { id: uid(), productId: "", quantity: 1, unitPriceTTC: 0 }]);
	};

	/**
	 * Remove a line item by ID (no-op if only one line remains)
	 * @param id - Line item unique ID
	 * @returns void
	 */
	const removeLine = (id: string) => {
		setLines((prev) => prev.length > 1 ? prev.filter((l) => l.id !== id) : prev);
	};

	/**
	 * Update a field on a line item
	 * @param id - Line item unique ID
	 * @param field - Field name to update
	 * @param value - New value
	 * @returns void
	 */
	const updateLine = (id: string, field: keyof LineItem, value: string | number) => {
		setLines((prev) => prev.map((l) => {
			if (l.id !== id) return l;
			// Auto-fill unit price from product catalogue when product changes
			if (field === "productId") {
				const product = products.find((p) => String(p.id) === value);
				return { ...l, productId: String(value), unitPriceTTC: product?.price ?? l.unitPriceTTC };
			}
			return { ...l, [field]: value };
		}));
	};

	/**
	 * Open the creation modal with a fresh form
	 * @returns void
	 */
	const openCreate = () => {
		setEditMode(false);
		setEditTarget(null);
		setCreatedSales([]);
		setFormTab("global");
		setModalTab("facture");
		setForm({ ...INITIAL_FORM, sellerId: String(user?.id || ""), date: new Date().toISOString().slice(0, 10) });
		setLines([{ id: uid(), productId: "", quantity: 1, unitPriceTTC: 0 }]);
		setShowModal(true);
	};

	/**
	 * Open the edit modal pre-populated with an existing sale
	 * @param s - Sale to edit
	 * @returns void
	 */
	const openEdit = (s: Sale) => {
		setEditMode(true);
		setEditTarget(s);
		setCreatedSales([]);
		setFormTab("global");
		setModalTab("facture");
		setForm({
			clientId: s.clientId ? String(s.clientId) : "",
			sellerId: String(s.sellerId),
			status: s.status,
			platform: s.platform || "",
			notes: "",
			date: new Date(s.date).toISOString().slice(0, 10),
		});
		setLines([{ id: uid(), productId: String(s.productId), quantity: s.quantity, unitPriceTTC: s.unitPriceTTC }]);
		setShowModal(true);
	};

	/**
	 * Save or update the current form (create multi or edit single)
	 * @returns void
	 */
	const handleSave = async () => {
		const validLines = lines.filter((l) => l.productId);
		if (validLines.length === 0 || !form.sellerId) {
			showToast("Au moins un produit et un vendeur sont requis", "error");
			return;
		}
		setSaving(true);
		try {
			if (editMode && editTarget) {
				// Single sale update
				const line = validLines[0];
				const ttc = line.quantity * line.unitPriceTTC;
				await api.put(`/sales/${editTarget.id}`, {
					productId: Number(line.productId),
					clientId: form.clientId ? Number(form.clientId) : null,
					sellerId: Number(form.sellerId),
					quantity: line.quantity,
					unitPriceTTC: line.unitPriceTTC,
					unitPriceHT: line.unitPriceTTC / (1 + TVA_RATE),
					totalTTC: ttc,
					totalHT: ttc / (1 + TVA_RATE),
					status: form.status,
					platform: form.platform || null,
					notes: form.notes || null,
					date: form.date,
				});
				showToast("Vente modifiée", "success");
				setShowModal(false);
				load();
			} else {
				// Create one sale per line item
				const created: Sale[] = [];
				for (const line of validLines) {
					const ttc = line.quantity * line.unitPriceTTC;
					const newSale = await api.post<Sale>("/sales", {
						productId: Number(line.productId),
						clientId: form.clientId ? Number(form.clientId) : null,
						sellerId: Number(form.sellerId),
						quantity: line.quantity,
						unitPriceTTC: line.unitPriceTTC,
						unitPriceHT: line.unitPriceTTC / (1 + TVA_RATE),
						totalTTC: ttc,
						totalHT: ttc / (1 + TVA_RATE),
						status: form.status,
						platform: form.platform || null,
						notes: form.notes || null,
						date: form.date,
					});
					created.push(newSale);
				}
				showToast(`${created.length} vente${created.length > 1 ? "s" : ""} créée${created.length > 1 ? "s" : ""}`, "success");
				setCreatedSales(created);
				setModalTab("facture");
				load();
			}
		} catch (e) {
			showToast((e as Error).message, "error");
		} finally {
			setSaving(false);
		}
	};

	/**
	 * Trigger PDF invoice generation for a sale
	 * @param sale - Sale to generate invoice for
	 * @returns void
	 */
	const handleDownloadInvoice = async (sale: Sale) => {
		try {
			const { generateInvoice } = await import("@/lib/generate-invoice");
			generateInvoice(sale);
		} catch {
			showToast("Impossible de générer la facture", "error");
		}
	};

	/**
	 * Prompt confirmation then delete a sale
	 * @param s - Sale to delete
	 * @returns void
	 */
	const handleDelete = async (s: Sale) => {
		const ok = await confirm({
			title: "Supprimer la vente",
			message: `Supprimer cette vente de ${s.product?.name || "produit"} ?`,
			confirmLabel: "Supprimer",
			danger: true,
		});
		if (!ok) return;
		try {
			await api.delete(`/sales/${s.id}`);
			showToast("Vente supprimée", "success");
			load();
		} catch (e) {
			showToast((e as Error).message, "error");
		}
	};

	const hasCreated = createdSales.length > 0;
	const validLineCount = lines.filter((l) => l.productId).length;

	return (
		<div>
			{/* Page header */}
			<div className="page-header-box">
				<div className="phb-left">
					<div className="phb-icon">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
							<line x1="12" y1="1" x2="12" y2="23" />
							<path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
						</svg>
					</div>
					<div className="phb-text">
						<h1>Ventes</h1>
						<p className="page-description">Gestion des ventes et commandes</p>
					</div>
				</div>
				<div className="page-header-box-actions">
					<button className="btn-primary btn-sm" onClick={openCreate}>
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
							<line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
						</svg>
						Nouvelle vente
					</button>
				</div>
			</div>

			{/* Stats bar */}
			<div className="stats-grid" style={{ gridTemplateColumns: "repeat(4,1fr)", marginBottom: "1.25rem" }}>
				{[
					{ label: "Total (page)", value: sales.length },
					{ label: "Complétées", value: completedSales.length },
					{ label: "CA page", value: eur(totalRevenue) },
					{ label: "En attente", value: pendingSales.length },
				].map((s) => (
					<div key={s.label} className="stat-card">
						<div className="stat-info">
							<div className="stat-value" style={{ fontSize: typeof s.value === "string" ? "1.15rem" : undefined }}>{s.value}</div>
							<div className="stat-label">{s.label}</div>
						</div>
					</div>
				))}
			</div>

			{/* Filters */}
			<div className="logs-controls" style={{ marginBottom: "1rem" }}>
				<div style={{ position: "relative", flex: 1, maxWidth: "260px" }}>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
						style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}>
						<circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
					</svg>
					<input className="search-input" type="search" placeholder="Produit, client, vendeur…"
						value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: "2.25rem" }} />
				</div>
				<select value={filterStatus}
					onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
					style={{ padding: "0.6rem 0.85rem", border: "1.5px solid var(--border-color)", borderRadius: "8px", background: "var(--card-bg)", color: "var(--text)", fontSize: "0.875rem" }}>
					<option value="">Tous les statuts</option>
					<option value="completed">Complétée</option>
					<option value="postponed">Reportée</option>
					<option value="cancelled">Annulée</option>
				</select>
				<select value={filterPlatform} onChange={(e) => setFilterPlatform(e.target.value)}
					style={{ padding: "0.6rem 0.85rem", border: "1.5px solid var(--border-color)", borderRadius: "8px", background: "var(--card-bg)", color: "var(--text)", fontSize: "0.875rem" }}>
					<option value="">Toutes les plateformes</option>
					{PLATFORMS.filter(Boolean).map((p) => <option key={p} value={p}>{p}</option>)}
				</select>
				<input type="date" value={dateFrom}
					onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
					style={{ padding: "0.6rem 0.85rem", border: "1.5px solid var(--border-color)", borderRadius: "8px", background: "var(--card-bg)", color: "var(--text)", fontSize: "0.875rem" }} />
				<input type="date" value={dateTo}
					onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
					style={{ padding: "0.6rem 0.85rem", border: "1.5px solid var(--border-color)", borderRadius: "8px", background: "var(--card-bg)", color: "var(--text)", fontSize: "0.875rem" }} />
				<button className="btn-secondary btn-sm"
					onClick={() => { setSearch(""); setFilterStatus(""); setFilterPlatform(""); setDateFrom(""); setDateTo(""); setPage(1); }}>
					Réinitialiser
				</button>
			</div>

			{/* Top pagination */}
			{totalPages > 1 && (
				<div style={{ marginBottom: "0.75rem" }}>
					<Pagination page={page} totalPages={totalPages} onPage={setPage} />
				</div>
			)}

			{/* Sales table */}
			<div className="card" style={{ padding: 0, overflow: "hidden" }}>
				{loading ? (
					<div className="empty-state"><p>Chargement…</p></div>
				) : filtered.length === 0 ? (
					<div className="empty-state"><h4>Aucune vente trouvée</h4></div>
				) : (
					<div style={{ overflowX: "auto" }}>
						<table className="data-table">
							<thead>
								<tr>
									<th>Date</th>
									<th>Produit</th>
									<th>Client</th>
									<th>Vendeur</th>
									<th style={{ textAlign: "right" }}>Qté</th>
									<th style={{ textAlign: "right" }}>Prix TTC</th>
									<th style={{ textAlign: "right" }}>Total TTC</th>
									<th>Statut</th>
									<th>Plateforme</th>
									<th style={{ textAlign: "right" }}>Actions</th>
								</tr>
							</thead>
							<tbody>
								{filtered.map((s) => (
									// Clicking a row opens the detail modal
									<tr key={s.id}
										onClick={() => setDetailSale(s)}
										style={{ cursor: "pointer" }}>
										<td style={{ fontSize: "0.8rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{formatDate(s.date)}</td>
										<td style={{ fontWeight: 600, fontSize: "0.875rem" }}>{s.product?.name || "—"}</td>
										<td style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>{s.client?.name || "—"}</td>
										<td>
											<div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
												<div style={{ width: "24px", height: "24px", background: "#2e4a8a", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.72rem", color: "#fff", flexShrink: 0 }}>
													{(s.seller?.username || s.seller?.name || "?").charAt(0).toUpperCase()}
												</div>
												<span style={{ fontSize: "0.82rem" }}>{s.seller?.name || "—"}</span>
											</div>
										</td>
										<td style={{ textAlign: "right", fontSize: "0.875rem" }}>{s.quantity}</td>
										<td style={{ textAlign: "right", fontSize: "0.875rem" }}>{eur(s.unitPriceTTC)}</td>
										<td style={{ textAlign: "right", fontWeight: 700, fontSize: "0.9rem", color: "var(--accent)" }}>{eur(s.totalTTC)}</td>
										<td><span className={`badge ${STATUS_BADGE[s.status]}`} style={{ fontSize: "0.72rem" }}>{STATUS_LABEL[s.status]}</span></td>
										<td>
											{s.platform
												? <span className="badge badge-light" style={{ fontSize: "0.72rem" }}>{s.platform}</span>
												: <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>—</span>}
										</td>
										<td>
											{/* stopPropagation prevents row click from firing */}
											<div style={{ display: "flex", justifyContent: "flex-end", gap: "0.3rem" }}
												onClick={(e) => e.stopPropagation()}>
												<button className="btn-icon" onClick={() => openEdit(s)} title="Modifier">
													<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
												</button>
												<button className="btn-icon" onClick={() => handleDownloadInvoice(s)} title="Facture">
													<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="12" y1="13" x2="12" y2="19" /><polyline points="9 16 12 19 15 16" /></svg>
												</button>
												<button className="btn-icon delete" onClick={() => handleDelete(s)} title="Supprimer">
													<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /></svg>
												</button>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>

			{/* Bottom pagination */}
			{totalPages > 1 && (
				<div style={{ marginTop: "1rem" }}>
					<Pagination page={page} totalPages={totalPages} onPage={setPage} />
				</div>
			)}

			{/* Create / Edit modal */}
			{showModal && (
				<div className="modal-overlay">
					<div className="modal-content" style={{ maxWidth: "860px", width: "96vw" }}>

						<div className="modal-header">
							<h3>{editMode ? "Modifier la vente" : hasCreated ? "Ventes créées" : "Nouvelle vente"}</h3>
							<button className="btn-icon" onClick={() => setShowModal(false)}>
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
									<line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
								</svg>
							</button>
						</div>

						{/* Success banner after creation */}
						{hasCreated && (
							<div style={{ margin: "0 1.5rem", padding: "0.75rem 1rem", background: "rgba(34,197,94,0.12)", border: "1.5px solid var(--success)", borderRadius: "8px", color: "var(--success)", fontWeight: 600, fontSize: "0.88rem", display: "flex", alignItems: "center", gap: "0.6rem" }}>
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
								{createdSales.length} vente{createdSales.length > 1 ? "s" : ""} créée{createdSales.length > 1 ? "s" : ""} avec succès
							</div>
						)}

						{/* Post-creation tabs (Facture / Journal) */}
						{hasCreated && (
							<div style={{ display: "flex", gap: "0.3rem", padding: "0.75rem 1.5rem 0", background: "transparent" }}>
								{(["facture", "logs"] as const).map((tab) => (
									<button key={tab} onClick={() => setModalTab(tab)}
										style={{
											padding: "0.45rem 1rem", borderRadius: "8px 8px 0 0", border: "1.5px solid var(--border-color)",
											borderBottom: modalTab === tab ? "1.5px solid var(--card-bg)" : "1.5px solid var(--border-color)",
											background: modalTab === tab ? "var(--card-bg)" : "var(--bg-alt)",
											color: modalTab === tab ? "var(--accent)" : "var(--text-muted)",
											fontWeight: modalTab === tab ? 700 : 400, fontSize: "0.82rem",
											cursor: "pointer", fontFamily: "inherit", marginBottom: "-1.5px",
										}}>
										{tab === "facture" ? "Facture" : "Journal"}
									</button>
								))}
							</div>
						)}

						<div className="modal-body">
							{hasCreated && modalTab === "logs" ? (
								/* Logs list after creation */
								<div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
									{createdSales.map((s) => (
										<div key={s.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.65rem 0.85rem", background: "var(--bg-alt)", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
											<div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--success)", flexShrink: 0 }} />
											<div style={{ flex: 1 }}>
												<span style={{ fontWeight: 600, fontSize: "0.85rem" }}>Vente #{s.id}</span>
												<span style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginLeft: "0.5rem" }}>
													{products.find((p) => p.id === s.productId)?.name || "Produit"} — {eur(s.totalTTC)}
												</span>
											</div>
											<span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>à l&apos;instant</span>
										</div>
									))}
								</div>
							) : hasCreated ? (
								/* Full-width invoice preview after creation */
								<div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
									<div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
										Aperçu facture
									</div>
									<InvoicePreview
										form={form}
										lines={lines}
										products={products}
										client={selectedClient}
										seller={selectedSeller}
									/>
								</div>
							) : (
								/* Creation / edit form — properties left, tabs + content right */
								<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", alignItems: "start" }}>

									{/* LEFT column: seller, client, status, platform, date, notes */}
									<div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
										<div style={{ marginBottom: "0.75rem", fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
											Informations
										</div>
										<div className="form-group">
											<label>Vendeur *</label>
											<select value={form.sellerId} onChange={(e) => setForm({ ...form, sellerId: e.target.value })}>
												<option value="">Sélectionner un vendeur</option>
												{users.map((u) => <option key={u.id} value={String(u.id)}>{u.name}</option>)}
											</select>
										</div>
										<div className="form-group">
											<label>Client (optionnel)</label>
											<select value={form.clientId}
												onChange={(e) => {
													// Auto-select "Direct" platform when a client is chosen and platform is blank
													const newClientId = e.target.value;
													const newPlatform = !form.platform && newClientId ? "Direct" : form.platform;
													setForm({ ...form, clientId: newClientId, platform: newPlatform });
												}}>
												<option value="">Sans client</option>
												{clients.map((c) => (
													<option key={c.id} value={String(c.id)}>{c.name}{c.company ? ` — ${c.company}` : ""}</option>
												))}
											</select>
										</div>
										<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
											<div className="form-group">
												<label>Statut</label>
												<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Sale["status"] })}>
													<option value="completed">Complétée</option>
													<option value="postponed">En attente</option>
													<option value="cancelled">Annulée</option>
												</select>
											</div>
											<div className="form-group">
												<label>Date</label>
												<input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
											</div>
										</div>
										<div className="form-group">
											<label>Plateforme</label>
											<select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}>
												{PLATFORMS.map((p) => <option key={p} value={p}>{p || "Aucune"}</option>)}
											</select>
										</div>
										<div className="form-group">
											<label>Notes</label>
											<textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
												rows={3} placeholder="Notes optionnelles…" style={{ resize: "vertical" }} />
										</div>
									</div>

									{/* RIGHT column: pill tabs at top, then tab content below */}
									<div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
										{/* Tab switcher pills */}
										<div style={{ display: "flex", gap: "0.4rem", marginBottom: "1rem" }}>
											{(["global", "facture"] as const).map((tab) => (
												<button key={tab} onClick={() => setFormTab(tab)}
													style={{
														padding: "0.4rem 1.1rem",
														borderRadius: "999px",
														border: "1.5px solid",
														borderColor: formTab === tab ? "var(--accent)" : "var(--border-color)",
														background: formTab === tab ? "var(--accent)" : "transparent",
														color: formTab === tab ? "#fff" : "var(--text-muted)",
														fontWeight: formTab === tab ? 700 : 400,
														fontSize: "0.82rem",
														cursor: "pointer",
														fontFamily: "inherit",
														transition: "all 0.15s",
													}}>
													{tab === "global" ? "Global" : "Facture"}
												</button>
											))}
										</div>

										{/* Tab content */}
										{formTab === "global" ? (
											/* Global tab — line items + totals */
											<div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
												<div style={{ marginBottom: "0.5rem", fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
													<span>Produits ({lines.length})</span>
													<button onClick={addLine} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: "0.72rem", fontWeight: 700, fontFamily: "inherit", display: "flex", alignItems: "center", gap: "0.25rem" }}>
														<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
														Ajouter
													</button>
												</div>

												{lines.map((line, idx) => {
													// Stock check for this line
													const available = line.productId ? getAvailableStock(line.productId) : Infinity;
													const stockInsufficient = line.productId && line.quantity > available;

													return (
														<div key={line.id} style={{
															display: "grid", gridTemplateColumns: "1fr 60px 90px 28px",
															gap: "0.4rem", alignItems: "start", marginBottom: "0.5rem",
															padding: "0.6rem", background: "var(--bg-alt)", borderRadius: "8px",
															border: `1px solid ${stockInsufficient ? "var(--danger, #ef4444)" : "var(--border-color)"}`,
														}}>
															<div className="form-group" style={{ marginBottom: 0 }}>
																<label style={{ fontSize: "0.68rem" }}>{idx === 0 ? "Produit *" : `N°${idx + 1}`}</label>
																<select value={line.productId} onChange={(e) => updateLine(line.id, "productId", e.target.value)}>
																	<option value="">Sélectionner…</option>
																	{products.map((p) => (
																		<option key={p.id} value={String(p.id)}>{p.name}{p.sku ? ` (${p.sku})` : ""}</option>
																	))}
																</select>
															</div>
															<div className="form-group" style={{ marginBottom: 0 }}>
																<label style={{ fontSize: "0.68rem" }}>Qté</label>
																<input type="number" min={1} value={line.quantity}
																	onChange={(e) => updateLine(line.id, "quantity", Number(e.target.value))} />
																{stockInsufficient && (
																	<div style={{ fontSize: "0.65rem", color: "var(--danger, #ef4444)", marginTop: "0.2rem", lineHeight: 1.2 }}>
																		Max {available}
																	</div>
																)}
															</div>
															<div className="form-group" style={{ marginBottom: 0 }}>
																<label style={{ fontSize: "0.68rem" }}>Prix TTC</label>
																<input type="number" min={0} step={0.01} value={line.unitPriceTTC}
																	onChange={(e) => updateLine(line.id, "unitPriceTTC", Number(e.target.value))} />
															</div>
															<button onClick={() => removeLine(line.id)} className="btn-icon delete"
																style={{ marginTop: "20px", opacity: lines.length > 1 ? 1 : 0.3 }}
																disabled={lines.length <= 1} title="Supprimer">
																<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
															</button>
														</div>
													);
												})}

												{/* Totals block below line items */}
												<div style={{ background: "var(--bg-alt)", borderRadius: "8px", padding: "0.75rem", marginTop: "0.25rem", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
													<div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", color: "var(--text-muted)" }}>
														<span>Sous-total HT</span><span style={{ fontWeight: 600 }}>{eur(linesTotalHT)}</span>
													</div>
													<div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", color: "var(--text-muted)" }}>
														<span>TVA (20%)</span><span style={{ fontWeight: 600 }}>{eur(linesTotalTVA)}</span>
													</div>
													<div style={{ height: "1px", background: "var(--border-color)", margin: "0.2rem 0" }} />
													<div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.95rem", fontWeight: 700, color: "var(--accent)" }}>
														<span>Total TTC</span><span>{eur(linesTotal)}</span>
													</div>
												</div>
											</div>
										) : (
											/* Facture tab — live invoice preview */
											<div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
												<div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
													Aperçu facture
												</div>
												<InvoicePreview
													form={form}
													lines={lines}
													products={products}
													client={selectedClient}
													seller={selectedSeller}
												/>
											</div>
										)}
									</div>
								</div>
							)}
						</div>

						<div className="modal-footer">
							<button className="btn-secondary btn-sm" onClick={() => setShowModal(false)}>
								{hasCreated ? "Fermer" : "Annuler"}
							</button>
							{hasCreated ? (
								createdSales.length === 1 ? (
									<button className="btn-primary btn-sm" onClick={() => handleDownloadInvoice(createdSales[0])}>
										<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="12" y1="13" x2="12" y2="19" /><polyline points="9 16 12 19 15 16" /></svg>
										Télécharger la facture PDF
									</button>
								) : null
							) : (
								// Save button disabled when stock errors or nothing selected
								<button
									className="btn-primary btn-sm"
									onClick={handleSave}
									disabled={saving || hasStockError}
									title={hasStockError ? "Un ou plusieurs produits ont un stock insuffisant" : undefined}>
									{saving
										? "Enregistrement…"
										: editMode
											? "Modifier"
											: `Créer ${validLineCount} vente${validLineCount > 1 ? "s" : ""}`}
								</button>
							)}
						</div>
					</div>
				</div>
			)}

			{/* Sale row detail modal */}
			{detailSale && (
				<SaleDetailModal
					sale={detailSale}
					products={products}
					onClose={() => setDetailSale(null)}
					onDownload={handleDownloadInvoice}
				/>
			)}
		</div>
	);
}
