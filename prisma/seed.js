const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
	console.log("🌱 Seeding database...");

	// ── Users ─────────────────────────────────────────────────────────────────
	const fabien = await prisma.user.upsert({
		where: { username: "fabien" },
		update: {},
		create: {
			username: "fabien",
			password: await bcrypt.hash("admin123", 10),
			name: "Fabien Jaeger",
			role: "admin",
			avatar: "F",
			active: true,
		},
	});

	const gino = await prisma.user.upsert({
		where: { username: "gino" },
		update: {},
		create: {
			username: "gino",
			password: await bcrypt.hash("gino123", 10),
			name: "Gino",
			role: "member",
			avatar: "G",
			active: true,
		},
	});

	console.log("✅ Users créés");

	// ── Products ──────────────────────────────────────────────────────────────
	const etb = await prisma.product.upsert({
		where: { id: 1 },
		update: {},
		create: {
			id: 1,
			name: "ETB",
			description: "Elite Trainer Box",
			price: 45.0,
			priceHT: 37.5,
			sku: "ETB-001",
			category: "Pokemon",
			alertThreshold: 10,
		},
	});

	const booster = await prisma.product.upsert({
		where: { id: 2 },
		update: {},
		create: {
			id: 2,
			name: "Booster Box",
			description: "Booster Box 36 packs",
			price: 120.0,
			priceHT: 100.0,
			sku: "BB-001",
			category: "Pokemon",
			alertThreshold: 5,
		},
	});

	const slab = await prisma.product.upsert({
		where: { id: 3 },
		update: {},
		create: {
			id: 3,
			name: "Carte PSA 10",
			description: "Carte gradée PSA 10",
			price: 250.0,
			priceHT: 208.33,
			sku: "PSA-001",
			category: "Cartes",
			alertThreshold: 2,
		},
	});

	const playmat = await prisma.product.upsert({
		where: { id: 4 },
		update: {},
		create: {
			id: 4,
			name: "Playmat",
			description: "Tapis de jeu Pokemon",
			price: 25.0,
			priceHT: 20.83,
			sku: "PM-001",
			category: "Accessoires",
			alertThreshold: 5,
		},
	});

	const sleeve = await prisma.product.upsert({
		where: { id: 5 },
		update: {},
		create: {
			id: 5,
			name: "Sleeves x100",
			description: "Protège-cartes x100",
			price: 8.0,
			priceHT: 6.67,
			sku: "SL-001",
			category: "Accessoires",
			alertThreshold: 20,
		},
	});

	console.log("✅ Produits créés");

	// ── Stocks ────────────────────────────────────────────────────────────────
	const stockData = [
		{ productId: etb.id, username: "fabien", quantity: 20 },
		{ productId: etb.id, username: "gino", quantity: 15 },
		{ productId: booster.id, username: "fabien", quantity: 8 },
		{ productId: booster.id, username: "gino", quantity: 5 },
		{ productId: slab.id, username: "fabien", quantity: 3 },
		{ productId: playmat.id, username: "fabien", quantity: 12 },
		{ productId: playmat.id, username: "gino", quantity: 8 },
		{ productId: sleeve.id, username: "fabien", quantity: 50 },
		{ productId: sleeve.id, username: "gino", quantity: 30 },
	];

	for (const stock of stockData) {
		await prisma.userStock.upsert({
			where: {
				productId_username: {
					productId: stock.productId,
					username: stock.username,
				},
			},
			update: { quantity: stock.quantity },
			create: stock,
		});

		await prisma.stockHistory.create({
			data: {
				productId: stock.productId,
				type: "entry",
				quantity: stock.quantity,
				stockBefore: 0,
				stockAfter: stock.quantity,
				userId: fabien.id,
				user: "Système",
				reason: "Initialisation du stock",
			},
		});
	}

	console.log("✅ Stocks créés");

	// ── Clients ───────────────────────────────────────────────────────────────
	const clientsData = [
		{
			name: "Thomas Martin",
			email: "thomas@example.com",
			phone: "06 12 34 56 78",
			company: "",
			status: "recurrent",
			notes: "Client fidèle depuis 2023",
		},
		{
			name: "Sophie Dubois",
			email: "sophie@example.com",
			phone: "07 98 76 54 32",
			company: "Card Shop Paris",
			status: "permanent",
			notes: "Revendeur pro",
		},
		{
			name: "Marc Lefevre",
			email: "marc@example.com",
			phone: "",
			company: "",
			status: "one-shot",
			notes: "",
		},
		{
			name: "Emma Bernard",
			email: "emma@example.com",
			phone: "06 55 44 33 22",
			company: "Collection Emma",
			status: "recurrent",
			notes: "Achète surtout des ETB",
		},
		{
			name: "Lucas Petit",
			email: "",
			phone: "07 11 22 33 44",
			company: "",
			status: "one-shot",
			notes: "",
		},
		{
			name: "Camille Moreau",
			email: "camille@example.com",
			phone: "06 77 88 99 00",
			company: "Pro Cards",
			status: "permanent",
			notes: "Commandes en gros",
		},
		{
			name: "Antoine Girard",
			email: "antoine@example.com",
			phone: "",
			company: "",
			status: "recurrent",
			notes: "",
		},
		{
			name: "Julie Leroy",
			email: "julie@example.com",
			phone: "07 22 33 44 55",
			company: "",
			status: "inactive",
			notes: "Plus de contact depuis août",
		},
		{
			name: "Pierre Roux",
			email: "pierre@example.com",
			phone: "06 66 77 88 99",
			company: "Galerie Cards",
			status: "permanent",
			notes: "Revendeur région sud",
		},
		{
			name: "Manon Simon",
			email: "manon@example.com",
			phone: "",
			company: "",
			status: "one-shot",
			notes: "Premier achat",
		},
	];

	const clients = [];
	for (const c of clientsData) {
		const client = await prisma.client.create({ data: c });
		clients.push(client);
	}

	console.log("✅ Clients créés");

	// ── Projects ──────────────────────────────────────────────────────────────
	const proj1 = await prisma.project.create({
		data: {
			name: "Site e-commerce",
			description: "Création du site de vente en ligne",
			status: "active",
			priority: "high",
			emoji: "🛒",
			members: { create: [{ userId: fabien.id }, { userId: gino.id }] },
		},
	});

	const proj2 = await prisma.project.create({
		data: {
			name: "Inventaire Q1 2025",
			description: "Inventaire complet du stock Q1",
			status: "active",
			priority: "medium",
			emoji: "📦",
			members: { create: [{ userId: fabien.id }] },
		},
	});

	const proj3 = await prisma.project.create({
		data: {
			name: "Event Paris Cards",
			description: "Organisation événement cartes Paris",
			status: "active",
			priority: "high",
			emoji: "🎴",
			members: { create: [{ userId: fabien.id }, { userId: gino.id }] },
		},
	});

	const proj4 = await prisma.project.create({
		data: {
			name: "Refonte catalogue",
			description: "Mise à jour du catalogue produits",
			status: "paused",
			priority: "low",
			emoji: "📋",
			members: { create: [{ userId: gino.id }] },
		},
	});

	const proj5 = await prisma.project.create({
		data: {
			name: "Partenariat Distributeur",
			description: "Négociation partenariat distributeur cards",
			status: "completed",
			priority: "high",
			emoji: "🤝",
			members: { create: [{ userId: fabien.id }] },
		},
	});

	console.log("✅ Projets créés");

	// ── Tasks ─────────────────────────────────────────────────────────────────
	const now = new Date();
	const tasksData = [
		{
			title: "Mettre à jour les prix ETB",
			status: "en_cours",
			priority: "high",
			assigneeId: fabien.id,
			projectId: proj2.id,
			dueDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
		},
		{
			title: "Créer fiche produit Booster Box",
			status: "en_cours",
			priority: "medium",
			assigneeId: gino.id,
			projectId: proj1.id,
			dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
		},
		{
			title: "Contacter Thomas Martin pour commande",
			status: "standby",
			priority: "medium",
			assigneeId: fabien.id,
			dueDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
		},
		{
			title: "Configurer paiement en ligne",
			status: "en_attente_avis",
			priority: "high",
			assigneeId: fabien.id,
			projectId: proj1.id,
			dueDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
		},
		{
			title: "Préparer commandes événement",
			status: "en_cours",
			priority: "high",
			assigneeId: gino.id,
			projectId: proj3.id,
			dueDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
		},
		{
			title: "Photographier nouveaux produits",
			status: "a_valider",
			priority: "low",
			assigneeId: gino.id,
			projectId: proj4.id,
		},
		{
			title: "Vérifier stock critique sous le seuil",
			status: "bloquee",
			priority: "high",
			assigneeId: fabien.id,
			projectId: proj2.id,
			dueDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000),
		},
		{
			title: "Rédiger compte-rendu réunion distributeur",
			status: "realisee",
			priority: "medium",
			assigneeId: fabien.id,
			projectId: proj5.id,
			completed: true,
		},
		{
			title: "Mise à jour CGV site",
			status: "en_cours",
			priority: "medium",
			assigneeId: fabien.id,
			projectId: proj1.id,
			dueDate: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
		},
		{
			title: "Relance clients inactifs",
			status: "standby",
			priority: "low",
			assigneeId: gino.id,
		},
	];

	for (const t of tasksData) {
		await prisma.task.create({ data: t });
	}

	console.log("✅ Tâches créées");

	// ── Sales ─────────────────────────────────────────────────────────────────
	const salesData = [
		{
			productId: etb.id,
			clientId: clients[0].id,
			sellerId: fabien.id,
			quantity: 2,
			unitPriceTTC: 45,
			unitPriceHT: 37.5,
			totalTTC: 90,
			totalHT: 75,
			status: "completed",
			platform: "evenement",
			date: new Date(now.getTime() - 0 * 24 * 60 * 60 * 1000),
		},
		{
			productId: booster.id,
			clientId: clients[1].id,
			sellerId: gino.id,
			quantity: 1,
			unitPriceTTC: 120,
			unitPriceHT: 100,
			totalTTC: 120,
			totalHT: 100,
			status: "completed",
			platform: "vente_locale",
			date: new Date(now.getTime() - 0 * 24 * 60 * 60 * 1000),
		},
		{
			productId: etb.id,
			clientId: clients[2].id,
			sellerId: fabien.id,
			quantity: 1,
			unitPriceTTC: 45,
			unitPriceHT: 37.5,
			totalTTC: 45,
			totalHT: 37.5,
			status: "completed",
			platform: "ebay",
			date: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
		},
		{
			productId: slab.id,
			clientId: clients[3].id,
			sellerId: fabien.id,
			quantity: 1,
			unitPriceTTC: 250,
			unitPriceHT: 208.33,
			totalTTC: 250,
			totalHT: 208.33,
			status: "completed",
			platform: "vente_locale",
			date: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
		},
		{
			productId: playmat.id,
			clientId: clients[4].id,
			sellerId: gino.id,
			quantity: 3,
			unitPriceTTC: 25,
			unitPriceHT: 20.83,
			totalTTC: 75,
			totalHT: 62.5,
			status: "completed",
			platform: "evenement",
			date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
		},
		{
			productId: sleeve.id,
			clientId: clients[5].id,
			sellerId: fabien.id,
			quantity: 5,
			unitPriceTTC: 8,
			unitPriceHT: 6.67,
			totalTTC: 40,
			totalHT: 33.33,
			status: "completed",
			platform: "vente_locale",
			date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
		},
		{
			productId: etb.id,
			clientId: clients[6].id,
			sellerId: gino.id,
			quantity: 3,
			unitPriceTTC: 45,
			unitPriceHT: 37.5,
			totalTTC: 135,
			totalHT: 112.5,
			status: "completed",
			platform: "evenement_pro",
			date: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
		},
		{
			productId: booster.id,
			clientId: clients[7].id,
			sellerId: fabien.id,
			quantity: 2,
			unitPriceTTC: 120,
			unitPriceHT: 100,
			totalTTC: 240,
			totalHT: 200,
			status: "cancelled",
			platform: "ebay",
			date: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
		},
		{
			productId: etb.id,
			clientId: clients[8].id,
			sellerId: fabien.id,
			quantity: 4,
			unitPriceTTC: 42,
			unitPriceHT: 35,
			totalTTC: 168,
			totalHT: 140,
			status: "completed",
			platform: "vente_locale",
			date: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
		},
		{
			productId: slab.id,
			clientId: clients[9].id,
			sellerId: gino.id,
			quantity: 1,
			unitPriceTTC: 300,
			unitPriceHT: 250,
			totalTTC: 300,
			totalHT: 250,
			status: "completed",
			platform: "vente_locale",
			date: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
		},
		{
			productId: playmat.id,
			clientId: clients[0].id,
			sellerId: fabien.id,
			quantity: 2,
			unitPriceTTC: 25,
			unitPriceHT: 20.83,
			totalTTC: 50,
			totalHT: 41.67,
			status: "completed",
			platform: "evenement",
			date: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
		},
		{
			productId: etb.id,
			clientId: clients[1].id,
			sellerId: gino.id,
			quantity: 5,
			unitPriceTTC: 45,
			unitPriceHT: 37.5,
			totalTTC: 225,
			totalHT: 187.5,
			status: "completed",
			platform: "evenement_pro",
			date: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000),
		},
		{
			productId: booster.id,
			clientId: clients[2].id,
			sellerId: fabien.id,
			quantity: 1,
			unitPriceTTC: 120,
			unitPriceHT: 100,
			totalTTC: 120,
			totalHT: 100,
			status: "completed",
			platform: "ebay",
			date: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
		},
		{
			productId: sleeve.id,
			clientId: clients[3].id,
			sellerId: gino.id,
			quantity: 10,
			unitPriceTTC: 7.5,
			unitPriceHT: 6.25,
			totalTTC: 75,
			totalHT: 62.5,
			status: "completed",
			platform: "vente_locale",
			date: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000),
		},
		{
			productId: etb.id,
			clientId: clients[4].id,
			sellerId: fabien.id,
			quantity: 2,
			unitPriceTTC: 45,
			unitPriceHT: 37.5,
			totalTTC: 90,
			totalHT: 75,
			status: "postponed",
			platform: "evenement",
			date: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
		},
		{
			productId: slab.id,
			clientId: clients[5].id,
			sellerId: fabien.id,
			quantity: 2,
			unitPriceTTC: 280,
			unitPriceHT: 233.33,
			totalTTC: 560,
			totalHT: 466.67,
			status: "completed",
			platform: "vente_locale",
			date: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
		},
		{
			productId: booster.id,
			clientId: clients[6].id,
			sellerId: gino.id,
			quantity: 3,
			unitPriceTTC: 115,
			unitPriceHT: 95.83,
			totalTTC: 345,
			totalHT: 287.5,
			status: "completed",
			platform: "evenement_pro",
			date: new Date(now.getTime() - 18 * 24 * 60 * 60 * 1000),
		},
		{
			productId: etb.id,
			clientId: clients[7].id,
			sellerId: fabien.id,
			quantity: 1,
			unitPriceTTC: 45,
			unitPriceHT: 37.5,
			totalTTC: 45,
			totalHT: 37.5,
			status: "completed",
			platform: "ebay",
			date: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
		},
		{
			productId: playmat.id,
			clientId: clients[8].id,
			sellerId: gino.id,
			quantity: 4,
			unitPriceTTC: 25,
			unitPriceHT: 20.83,
			totalTTC: 100,
			totalHT: 83.33,
			status: "completed",
			platform: "vente_locale",
			date: new Date(now.getTime() - 22 * 24 * 60 * 60 * 1000),
		},
		{
			productId: slab.id,
			clientId: clients[9].id,
			sellerId: fabien.id,
			quantity: 1,
			unitPriceTTC: 400,
			unitPriceHT: 333.33,
			totalTTC: 400,
			totalHT: 333.33,
			status: "completed",
			platform: "vente_locale",
			date: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000),
		},
	];

	for (const s of salesData) {
		await prisma.sale.create({ data: s });
	}

	console.log("✅ Ventes créées");

	// ── Events ────────────────────────────────────────────────────────────────
	const eventsData = [
		{
			title: "Event Paris Cards",
			description: "Événement cartes Paris",
			date: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
			type: "meeting",
			color: "#2e4a8a",
			userId: fabien.id,
			projectId: proj3.id,
		},
		{
			title: "Réunion distributeur",
			description: "Appel avec le distributeur",
			date: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
			type: "call",
			color: "#b8923a",
			userId: fabien.id,
		},
		{
			title: "Inventaire mensuel",
			description: "Vérification du stock",
			date: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000),
			type: "reminder",
			color: "#2d7a4f",
			userId: fabien.id,
			projectId: proj2.id,
		},
		{
			title: "Relance Thomas Martin",
			description: "Rappel commande",
			date: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
			type: "call_urgent",
			color: "#c0392b",
			userId: gino.id,
		},
		{
			title: "Point équipe",
			description: "Réunion hebdomadaire",
			date: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
			type: "meeting",
			color: "#2e4a8a",
			userId: fabien.id,
		},
	];

	for (const e of eventsData) {
		await prisma.event.create({ data: e });
	}

	console.log("✅ Événements créés");

	// ── Logs ──────────────────────────────────────────────────────────────────
	const logsData = [
		{
			action: "Connexion",
			details: "Fabien Jaeger connecté",
			userId: fabien.id,
			userName: "Fabien Jaeger",
			module: "auth",
			timestamp: new Date(now.getTime() - 1 * 60 * 60 * 1000),
		},
		{
			action: "Création vente",
			details: "Vente créée — 2x ETB",
			userId: fabien.id,
			userName: "Fabien Jaeger",
			module: "sales",
			timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000),
		},
		{
			action: "Connexion",
			details: "Gino connecté",
			userId: gino.id,
			userName: "Gino",
			module: "auth",
			timestamp: new Date(now.getTime() - 3 * 60 * 60 * 1000),
		},
		{
			action: "Modification produit",
			details: 'Produit "ETB" modifié',
			userId: fabien.id,
			userName: "Fabien Jaeger",
			module: "products",
			timestamp: new Date(now.getTime() - 24 * 60 * 60 * 1000),
		},
		{
			action: "Création client",
			details: 'Client "Thomas Martin" créé',
			userId: fabien.id,
			userName: "Fabien Jaeger",
			module: "clients",
			timestamp: new Date(now.getTime() - 48 * 60 * 60 * 1000),
		},
	];

	for (const l of logsData) {
		await prisma.log.create({ data: l });
	}

	console.log("✅ Logs créés");
	console.log("\n🎉 Seeding terminé avec succès !");
	console.log("\nComptes de test :");
	console.log("  📧 fabien | 🔑 admin123 (Admin)");
	console.log("  📧 gino   | 🔑 gino123  (Member)");
}

main()
	.catch((e) => {
		console.error("❌ Erreur seed :", e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
