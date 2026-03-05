/**
 * Company information used on all generated invoices.
 * Update these values before going into production.
 */
export const COMPANY = {
	name: "Lance Strategy",
	legalForm: "SARL",
	address: "À compléter",
	postalCode: "00000",
	city: "Ville",
	country: "France",
	phone: "À compléter",
	email: "contact@lance-strategy.fr",
	website: "www.lance-strategy.fr",
	siret: "000 000 000 00000",
	nafCode: "0000Z",
	tvaNumber: "FR00 000000000",
	rcs: "RCS Ville 000 000 000",
	capital: "1 000 €",
} as const;

/**
 * Default payment terms shown on invoices.
 */
export const PAYMENT_TERMS =
	"Paiement à réception de facture. Règlement par virement bancaire.";

/**
 * Legal late-payment penalty notice (required by French law for B2B invoices).
 */
export const LATE_PAYMENT_NOTICE =
	"En cas de retard de paiement, des pénalités de retard au taux légal en vigueur seront appliquées. " +
	"Indemnité forfaitaire pour frais de recouvrement : 40 €.";

/** VAT rate used for HT ↔ TTC conversions when not explicitly provided. */
export const DEFAULT_TVA_RATE = 0.2;

/** Invoice number prefix */
export const INVOICE_PREFIX = "FACT";
