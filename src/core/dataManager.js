const DataManager = {
	storageKey: "lanceStrategyData",

	// Initialize default data
	init() {
		console.log("DataManager.init() appelé");

		const defaultData = {
			users: [
				{
					id: 1,
					username: "fabien",
					password: "admin123",
					name: "Fabien Jaeger",
					role: "admin",
					avatar: "F",
					active: true,
					createdAt: new Date().toISOString(),
				},
				{
					id: 2,
					username: "gino",
					password: "gino123",
					name: "Gino",
					role: "member",
					avatar: "G",
					active: true,
					createdAt: new Date().toISOString(),
				},
			],
			products: [
				{
					id: 1,
					name: "ETB",
					description: "Elite Trainer Box",
					price: 45.0,
					priceHT: 37.5,
					sku: "ETB-001",
					category: "Pokemon",
					alertThreshold: 10,
					stock: {
						fabien: 20,
						gino: 15,
					},
					stockHistory: [
						{
							date: new Date().toISOString(),
							type: "entry",
							quantity: 35,
							stockBefore: 0,
							stockAfter: 35,
							userId: 1,
							user: "Système",
							reason: "Initialisation du stock",
							reference: null,
						},
					],
					createdAt: new Date().toISOString(),
				},
			],
			sales: [],
			cancelledSales: [],
			postponedSales: [],
			clients: [],
			tasks: [],
			projects: [],
			logs: [],
		};

		const existingData = this.getData();

		// Always validate and restore defaults if needed
		if (
			!existingData ||
			!existingData.users ||
			existingData.users.length === 0 ||
			!existingData.users.some((u) => u.username === "fabien")
		) {
			console.log(
				"⚠️ Réinitialisation nécessaire - restauration des données par défaut",
			);
			this.saveData(defaultData);
			console.log("✓ Données par défaut restaurées");
		} else {
			// Check and update product schema structure
			const data = existingData;
			let needsUpdate = false;

			if (data.products) {
				data.products = data.products.map((product) => {
					let updatedProduct = { ...product };
					let productUpdated = false;

					// Add stockHistory if missing
					if (!updatedProduct.stockHistory) {
						const totalStock = Object.values(
							updatedProduct.stock || {},
						).reduce((sum, qty) => sum + qty, 0);
						updatedProduct.stockHistory = [
							{
								date: new Date().toISOString(),
								type: "entry",
								quantity: totalStock,
								stockBefore: 0,
								stockAfter: totalStock,
								userId: 1,
								user: "Système",
								reason: "Migration - Initialisation de l'historique",
								reference: null,
							},
						];
						productUpdated = true;
					}

					// Add alertThreshold if missing
					if (!updatedProduct.alertThreshold) {
						updatedProduct.alertThreshold = 10;
						productUpdated = true;
					}

					// Add category if missing
					if (!updatedProduct.category) {
						updatedProduct.category = "";
						productUpdated = true;
					}

					// Add sku if missing
					if (!updatedProduct.sku) {
						updatedProduct.sku = "";
						productUpdated = true;
					}

					if (productUpdated) {
						needsUpdate = true;
						console.log(
							`Produit "${updatedProduct.name}" mis à jour avec les nouveaux champs`,
						);
					}

					return updatedProduct;
				});

				if (needsUpdate) {
					this.saveData(data);
					console.log("✓ Structure des produits mise à jour");
				}
			}
		}
	},

	// Get all data
	getData() {
		try {
			const data = localStorage.getItem(this.storageKey);
			if (!data) {
				console.log("Aucune donnée trouvée - création structure vide");
				return {
					users: [],
					products: [],
					sales: [],
					cancelledSales: [],
					postponedSales: [],
					clients: [],
					tasks: [],
					projects: [],
					logs: [],
				};
			}
			return JSON.parse(data);
		} catch (e) {
			console.error("Erreur lors de la lecture des données:", e);
			return {
				users: [],
				products: [],
				sales: [],
				cancelledSales: [],
				postponedSales: [],
				clients: [],
				tasks: [],
				projects: [],
				logs: [],
			};
		}
	},

	// Save all data
	saveData(data) {
		localStorage.setItem(this.storageKey, JSON.stringify(data));
		console.log("Données sauvegardées");
	},

	// Alias for backward compatibility
	save() {
		const data = this.getData();
		this.saveData(data);
	},

	// Get specific collection
	get(collection) {
		const data = this.getData();
		return data ? data[collection] : [];
	},

	// Add item to collection
	add(collection, item) {
		const data = this.getData();
		if (!data[collection]) data[collection] = [];

		// Generate ID
		const maxId = Math.max(
			0,
			...(data[collection]?.map((i) => i.id || 0) || []),
		);
		item.id = maxId + 1;
		item.createdAt = new Date().toISOString();

		data[collection].push(item);
		this.saveData(data);
		console.log(`Ajout à ${collection}:`, item);

		// Notify listeners that a collection changed
		window.dispatchEvent(
			new CustomEvent("dataChanged", { detail: { collection } }),
		);
		return item;
	},

	// Update item in collection
	update(collection, id, updates) {
		const data = this.getData();

		if (!data[collection]) return null;

		const index = data[collection].findIndex((item) => item.id === id);
		if (index !== -1) {
			data[collection][index] = {
				...data[collection][index],
				...updates,
			};
			this.saveData(data);
			console.log(
				`Mise à jour de ${collection}:`,
				data[collection][index],
			);

			// Notify listeners that a collection changed
			window.dispatchEvent(
				new CustomEvent("dataChanged", { detail: { collection } }),
			);
			return data[collection][index];
		}
		return null;
	},

	// Delete item from collection
	delete(collection, id) {
		const data = this.getData();

		if (!data[collection]) return false;

		const initialLength = data[collection].length;
		data[collection] = data[collection].filter((item) => item.id !== id);

		if (data[collection].length < initialLength) {
			this.saveData(data);
			console.log(`Suppression de ${collection} id:${id}`);

			// Notify listeners that a collection changed
			window.dispatchEvent(
				new CustomEvent("dataChanged", { detail: { collection } }),
			);
			return true;
		}
		return false;
	},

	// Find item by ID
	findById(collection, id) {
		const data = this.getData();
		return (
			data[collection]?.find((item) => item.id === parseInt(id)) || null
		);
	},

	// Add log entry
	addLog(action, details, userId) {
		const data = this.getData();
		const log = {
			id: (data.logs?.length || 0) + 1,
			action,
			details,
			userId,
			userName: this.findById("users", userId)?.name || "Unknown",
			timestamp: new Date().toISOString(),
		};

		if (!data.logs) data.logs = [];
		data.logs.push(log);

		this.saveData(data);
		console.log("Log ajouté:", log);
	},
};

window.DataManager = DataManager;
