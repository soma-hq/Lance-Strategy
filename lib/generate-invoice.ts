import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
	COMPANY,
	PAYMENT_TERMS,
	LATE_PAYMENT_NOTICE,
	DEFAULT_TVA_RATE,
	INVOICE_PREFIX,
} from "./invoice-config";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InvoiceSale {
	id: number;
	date: string | Date;
	quantity: number;
	unitPriceTTC: number;
	unitPriceHT: number;
	totalTTC: number;
	totalHT: number;
	platform?: string | null;
	product?: { id: number; name: string } | null;
	client?: { id: number; name: string } | null;
	seller?: { id: number; name: string; username: string } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EUR = (n: number) =>
	n.toLocaleString("fr-FR", {
		style: "currency",
		currency: "EUR",
		minimumFractionDigits: 2,
	});

const DATE_FR = (d: string | Date) =>
	new Date(d).toLocaleDateString("fr-FR", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	});

function invoiceNumber(saleId: number, date: string | Date): string {
	const year = new Date(date).getFullYear();
	return `${INVOICE_PREFIX}-${year}-${String(saleId).padStart(5, "0")}`;
}

// ─── Palette ──────────────────────────────────────────────────────────────────

const C = {
	navy: [26, 39, 68] as [number, number, number],
	gold: [184, 146, 58] as [number, number, number],
	white: [255, 255, 255] as [number, number, number],
	light: [248, 249, 252] as [number, number, number],
	border: [220, 224, 235] as [number, number, number],
	text: [30, 40, 65] as [number, number, number],
	muted: [110, 120, 145] as [number, number, number],
	danger: [180, 0, 0] as [number, number, number],
};

// ─── Main generator ───────────────────────────────────────────────────────────

/**
 * Generate a legally compliant French invoice as a PDF and trigger
 * an in-browser download.
 *
 * @param sale - Sale data returned by the API after creation
 */
export function generateInvoice(sale: InvoiceSale): void {
	const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

	const W = doc.internal.pageSize.getWidth(); // 210
	const ML = 15; // left margin
	const MR = 15; // right margin
	const CW = W - ML - MR; // content width = 180
	const invNum = invoiceNumber(sale.id, sale.date);

	// ── 1. Header band ──────────────────────────────────────────────────────
	doc.setFillColor(...C.navy);
	doc.rect(0, 0, W, 52, "F");

	// Company name — large, gold
	doc.setFont("helvetica", "bold");
	doc.setFontSize(22);
	doc.setTextColor(...C.gold);
	doc.text(COMPANY.name.toUpperCase(), ML, 18);

	// Legal form + city
	doc.setFont("helvetica", "normal");
	doc.setFontSize(8.5);
	doc.setTextColor(...C.white);
	doc.text(
		[
			`${COMPANY.legalForm} — Capital : ${COMPANY.capital}`,
			`${COMPANY.address}`,
			`${COMPANY.postalCode} ${COMPANY.city.toUpperCase()}`,
			`SIRET : ${COMPANY.siret}   |   NAF : ${COMPANY.nafCode}`,
			`N° TVA : ${COMPANY.tvaNumber}`,
		],
		ML,
		26,
		{ lineHeightFactor: 1.5 },
	);

	// "FACTURE" label — right aligned, gold
	doc.setFont("helvetica", "bold");
	doc.setFontSize(28);
	doc.setTextColor(...C.gold);
	doc.text("FACTURE", W - MR, 18, { align: "right" });

	// Invoice meta — right aligned, white
	doc.setFont("helvetica", "normal");
	doc.setFontSize(8.5);
	doc.setTextColor(...C.white);
	doc.text(
		[
			`Numéro : ${invNum}`,
			`Date d'émission : ${DATE_FR(new Date())}`,
			`Date de vente : ${DATE_FR(sale.date)}`,
			`Référence : VENTE-${sale.id}`,
		],
		W - MR,
		26,
		{ align: "right", lineHeightFactor: 1.5 },
	);

	// Gold separator line
	doc.setDrawColor(...C.gold);
	doc.setLineWidth(0.6);
	doc.line(ML, 50, W - MR, 50);

	// ── 2. "Facturé à" block ────────────────────────────────────────────────
	let y = 62;

	doc.setFont("helvetica", "bold");
	doc.setFontSize(7.5);
	doc.setTextColor(...C.muted);
	doc.text("FACTURÉ À", ML, y);
	doc.text("ÉMIS PAR", W / 2 + 5, y);

	y += 4;

	// Client box
	doc.setFillColor(...C.light);
	doc.setDrawColor(...C.border);
	doc.setLineWidth(0.3);
	doc.roundedRect(ML, y, CW / 2 - 5, 28, 2, 2, "FD");

	// Seller box
	doc.roundedRect(W / 2 + 5, y, CW / 2 - 5, 28, 2, 2, "FD");

	// Client info
	doc.setFont("helvetica", "bold");
	doc.setFontSize(10);
	doc.setTextColor(...C.navy);
	doc.text(sale.client?.name || "Client non renseigné", ML + 4, y + 8);

	doc.setFont("helvetica", "normal");
	doc.setFontSize(8.5);
	doc.setTextColor(...C.text);
	doc.text(
		sale.client ? "Client enregistré" : "Vente sans client",
		ML + 4,
		y + 14,
	);

	// Seller info
	doc.setFont("helvetica", "bold");
	doc.setFontSize(10);
	doc.setTextColor(...C.navy);
	doc.text(COMPANY.name, W / 2 + 9, y + 8);

	doc.setFont("helvetica", "normal");
	doc.setFontSize(8.5);
	doc.setTextColor(...C.text);
	doc.text(
		[
			`Vendeur : ${sale.seller?.name || "—"}`,
			`${COMPANY.postalCode} ${COMPANY.city}`,
			`${COMPANY.email}`,
		],
		W / 2 + 9,
		y + 14,
		{ lineHeightFactor: 1.55 },
	);

	y += 36;

	// ── 3. Platform badge (if any) ──────────────────────────────────────────
	if (sale.platform) {
		doc.setFillColor(...C.navy);
		doc.setTextColor(...C.white);
		doc.setFont("helvetica", "bold");
		doc.setFontSize(7.5);
		const badgeText = `  PLATEFORME : ${sale.platform.toUpperCase()}  `;
		const badgeW = doc.getTextWidth(badgeText) + 4;
		doc.roundedRect(ML, y, badgeW, 6, 1, 1, "F");
		doc.text(badgeText, ML + 2, y + 4);
		y += 10;
	}

	// ── 4. Items table ──────────────────────────────────────────────────────
	const htUnit =
		sale.unitPriceHT > 0
			? sale.unitPriceHT
			: sale.unitPriceTTC / (1 + DEFAULT_TVA_RATE);
	const htTotal =
		sale.totalHT > 0 ? sale.totalHT : sale.totalTTC / (1 + DEFAULT_TVA_RATE);
	const tvaAmount = sale.totalTTC - htTotal;
	const tvaRate = (DEFAULT_TVA_RATE * 100).toFixed(0) + " %";

	autoTable(doc, {
		startY: y,
		margin: { left: ML, right: MR },
		head: [
			[
				"Désignation",
				"Qté",
				"Prix unit. HT",
				"Taux TVA",
				"Montant TVA",
				"Total TTC",
			],
		],
		body: [
			[
				sale.product?.name || `Produit #${sale.id}`,
				String(sale.quantity),
				EUR(htUnit),
				tvaRate,
				EUR(tvaAmount),
				EUR(sale.totalTTC),
			],
		],
		styles: {
			font: "helvetica",
			fontSize: 9,
			textColor: C.text,
			cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
		},
		headStyles: {
			fillColor: C.navy,
			textColor: C.white,
			fontStyle: "bold",
			fontSize: 8,
			halign: "center",
		},
		columnStyles: {
			0: { halign: "left", cellWidth: "auto" },
			1: { halign: "center", cellWidth: 12 },
			2: { halign: "right", cellWidth: 30 },
			3: { halign: "center", cellWidth: 20 },
			4: { halign: "right", cellWidth: 28 },
			5: { halign: "right", cellWidth: 30 },
		},
		alternateRowStyles: { fillColor: C.light },
		tableLineColor: C.border,
		tableLineWidth: 0.2,
		didDrawPage: () => {},
	});

	// ── 5. Totals block ──────────────────────────────────────────────────────
	const afterTable = (doc as unknown as { lastAutoTable: { finalY: number } })
		.lastAutoTable.finalY;
	const totalsX = W - MR - 70;
	y = afterTable + 8;

	const row = (label: string, value: string, bold = false) => {
		doc.setFont("helvetica", bold ? "bold" : "normal");
		doc.setFontSize(bold ? 10 : 9);
		if (bold) doc.setTextColor(...C.navy);
		else doc.setTextColor(...C.text);
		doc.text(label, totalsX, y);
		doc.text(value, W - MR, y, { align: "right" });
		y += bold ? 8 : 6;
	};

	// Divider above totals
	doc.setDrawColor(...C.border);
	doc.setLineWidth(0.3);
	doc.line(totalsX - 2, y - 3, W - MR, y - 3);

	row("Sous-total HT", EUR(htTotal));
	row(`TVA (${tvaRate})`, EUR(tvaAmount));

	// TTC row with gold background
	const ttcY = y;
	doc.setFillColor(...C.navy);
	doc.roundedRect(totalsX - 4, ttcY - 4, W - MR - totalsX + 4 + 4, 10, 1.5, 1.5, "F");

	doc.setFont("helvetica", "bold");
	doc.setFontSize(11);
	doc.setTextColor(...C.gold);
	doc.text("TOTAL TTC", totalsX, ttcY + 3);
	doc.text(EUR(sale.totalTTC), W - MR, ttcY + 3, { align: "right" });
	y = ttcY + 14;

	// ── 6. Payment & legal footer ────────────────────────────────────────────
	const pageH = doc.internal.pageSize.getHeight(); // 297
	const footerStartY = Math.max(y + 6, pageH - 58);

	doc.setDrawColor(...C.gold);
	doc.setLineWidth(0.4);
	doc.line(ML, footerStartY, W - MR, footerStartY);

	// Payment terms
	doc.setFont("helvetica", "bold");
	doc.setFontSize(8);
	doc.setTextColor(...C.navy);
	doc.text("CONDITIONS DE PAIEMENT", ML, footerStartY + 6);

	doc.setFont("helvetica", "normal");
	doc.setFontSize(8);
	doc.setTextColor(...C.text);
	const terms = doc.splitTextToSize(PAYMENT_TERMS, CW);
	doc.text(terms, ML, footerStartY + 11);

	// Late payment notice
	doc.setFont("helvetica", "italic");
	doc.setFontSize(7);
	doc.setTextColor(...C.muted);
	const notice = doc.splitTextToSize(LATE_PAYMENT_NOTICE, CW);
	doc.text(notice, ML, footerStartY + 19);

	// Bottom company strip
	doc.setFillColor(...C.navy);
	doc.rect(0, pageH - 18, W, 18, "F");

	doc.setFont("helvetica", "normal");
	doc.setFontSize(7);
	doc.setTextColor(...C.white);
	const footerLine = [
		COMPANY.name,
		`${COMPANY.legalForm} au capital de ${COMPANY.capital}`,
		`${COMPANY.rcs}`,
		`SIRET ${COMPANY.siret}`,
		`${COMPANY.tvaNumber}`,
	].join("   ·   ");
	doc.text(footerLine, W / 2, pageH - 10, { align: "center" });

	doc.setTextColor(...C.gold);
	doc.setFontSize(7);
	doc.text(`Document original — ${invNum}`, W / 2, pageH - 5, {
		align: "center",
	});

	// ── 7. Save ──────────────────────────────────────────────────────────────
	doc.save(`${invNum}.pdf`);
}
