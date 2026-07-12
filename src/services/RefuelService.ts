import Refuel, { IRefuel } from "../models/Refuel";
import { Err, Succ } from "./globalService";
import { toCSV, parseCSV } from "../utils/csv";

export interface CreateRefuelDTO {
	userId: string;
	vehicleId: string;
	fuelType: string;
	note?: string;
	liters: number;
	pricePerLiter: number;
	totalPrice: number;
	mileage: number;
	date?: Date;
}

export interface RefuelPayload {
	id: string;
	userId: string;
	vehicleId: string;
	fuelType: string;
	note?: string;
	liters: number;
	pricePerLiter: number;
	totalPrice: number;
	mileage: number;
	date: Date;
	createdAt: Date;
}

class RefuelService {
	static async create(data: CreateRefuelDTO): Promise<RefuelPayload> {
		try {
			const refuel = new Refuel({
				userId: data.userId,
				vehicleId: data.vehicleId,
				fuelType: data.fuelType,
				note: data.note,
				liters: data.liters,
				pricePerLiter: data.pricePerLiter,
				totalPrice: data.totalPrice,
				mileage: data.mileage,
				date: data.date ? new Date(data.date) : new Date(),
			} as Partial<IRefuel>);

			await refuel.save();

			const payload: RefuelPayload = {
				id: refuel.id,
				userId: refuel.userId,
				vehicleId: refuel.vehicleId,
				fuelType: refuel.fuelType,
				note: refuel.note,
				liters: refuel.liters,
				pricePerLiter: refuel.pricePerLiter,
				totalPrice: refuel.totalPrice,
				mileage: refuel.mileage,
				date: refuel.date || refuel.createdAt,
				createdAt: refuel.createdAt,
			};

			new Succ(201, "Refuel created", payload);
			return payload;
		} catch (err: any) {
			new Err(500, "Refuel creation failed", err);
			throw err;
		}
	}

	static async getById(id: string, userId: string): Promise<RefuelPayload | null> {
		try {
			const refuel = await Refuel.findOne({ _id: id, userId });
			if (!refuel) {
				new Err(404, "Refuel not found", { id, userId });
				return null;
			}

			const payload: RefuelPayload = {
				id: refuel.id,
				userId: refuel.userId,
				vehicleId: refuel.vehicleId,
				fuelType: refuel.fuelType,
				note: refuel.note,
				liters: refuel.liters,
				pricePerLiter: refuel.pricePerLiter,
				totalPrice: refuel.totalPrice,
				mileage: refuel.mileage,
				date: refuel.date || refuel.createdAt,
				createdAt: refuel.createdAt,
			};

			new Succ(200, "Refuel fetched", payload);
			return payload;
		} catch (err: any) {
			new Err(500, "Refuel fetch failed", err);
			throw err;
		}
	}

	static async list(userId: string): Promise<RefuelPayload[]> {
		try {
			const refuels = await Refuel.find({ userId });
			const payload = refuels.map((r) => ({
				id: r.id,
				userId: r.userId,
				vehicleId: r.vehicleId,
				fuelType: r.fuelType,
				note: r.note,
				liters: r.liters,
				pricePerLiter: r.pricePerLiter,
				totalPrice: r.totalPrice,
				mileage: r.mileage,
				date: r.date || r.createdAt,
				createdAt: r.createdAt,
			}));
			new Succ(200, "Fetched refuels", payload);
			return payload;
		} catch (err: any) {
			new Err(500, "Refuel fetch failed", err);
			throw err;
		}
	}

	static async update(
		id: string,
		userId: string,
		payload: Partial<Pick<IRefuel, "vehicleId" | "fuelType" | "note" | "liters" | "pricePerLiter" | "totalPrice" | "mileage" | "date">>,
	): Promise<RefuelPayload> {
		try {
			const updated = await Refuel.findOneAndUpdate({ _id: id, userId }, payload, { new: true });
			if (!updated) {
				new Err(404, "Refuel not found");
				throw new Error("Refuel not found");
			}
			const result: RefuelPayload = {
				id: updated.id,
				userId: updated.userId,
				vehicleId: updated.vehicleId,
				fuelType: updated.fuelType,
				note: updated.note,
				liters: updated.liters,
				pricePerLiter: updated.pricePerLiter,
				totalPrice: updated.totalPrice,
				mileage: updated.mileage,
				date: updated.date || updated.createdAt,
				createdAt: updated.createdAt,
			};
			new Succ(200, "Refuel updated", result);
			return result;
		} catch (err: any) {
			if (err.message === "Refuel not found") {
				throw err;
			}
			new Err(500, "Refuel update failed", err);
			throw err;
		}
	}

	static async remove(id: string, userId: string): Promise<void> {
		try {
			const deleted = await Refuel.findOneAndDelete({ _id: id, userId });
			if (!deleted) {
				new Err(404, `Refuel not found or not owned by user`, { id, userId });
				throw new Error("Refuel not found");
			}
			new Succ(200, "Refuel removed", { id });
		} catch (err: any) {
			if (err.message === "Refuel not found") {
				throw err;
			}
			new Err(500, "Refuel deletion failed", err);
			throw err;
		}
	}

	static async exportCSV(userId: string, vehicleId?: string): Promise<string> {
		try {
			const filter: any = { userId };
			if (vehicleId) {
				filter.vehicleId = vehicleId;
			}
			const refuels = await Refuel.find(filter).sort({ mileage: 1 });
			const rows = refuels.map((r) => ({
				id: r.id,
				vehicleId: r.vehicleId,
				fuelType: r.fuelType,
				note: r.note || "",
				liters: r.liters,
				pricePerLiter: r.pricePerLiter,
				totalPrice: r.totalPrice,
				mileage: r.mileage,
				date: r.date ? r.date.toISOString() : r.createdAt.toISOString(),
				createdAt: r.createdAt.toISOString(),
			}));
			return toCSV(rows);
		} catch (err: any) {
			new Err(500, "Refuel export CSV failed", err);
			throw err;
		}
	}

	static async importCSV(userId: string, csvContent: string, defaultVehicleId?: string): Promise<RefuelPayload[]> {
		try {
			const parsedRows = parseCSV(csvContent);
			const importedPayloads: RefuelPayload[] = [];
			const VehicleService = require("./VehicleService").default;

			for (const row of parsedRows) {
				const rowVehicleId = row.vehicleId || defaultVehicleId;
				if (!rowVehicleId) {
					throw new Error("Missing vehicleId. Provide a default vehicleId or include it in the CSV rows.");
				}

				// Verify ownership of the vehicle
				const vehicle = await VehicleService.getById(rowVehicleId, userId);
				if (!vehicle) {
					throw new Error(`Vehicle with ID ${rowVehicleId} not found or not owned by user`);
				}

				if (!row.fuelType) {
					throw new Error("Missing fuelType in CSV row");
				}
				if (!row.liters || isNaN(Number(row.liters))) {
					throw new Error("Invalid or missing liters in CSV row");
				}
				if (!row.pricePerLiter || isNaN(Number(row.pricePerLiter))) {
					throw new Error("Invalid or missing pricePerLiter in CSV row");
				}
				if (!row.totalPrice || isNaN(Number(row.totalPrice))) {
					throw new Error("Invalid or missing totalPrice in CSV row");
				}
				if (!row.mileage || isNaN(Number(row.mileage))) {
					throw new Error("Invalid or missing mileage in CSV row");
				}

				const refuel = new Refuel({
					userId,
					vehicleId: rowVehicleId,
					fuelType: row.fuelType,
					note: row.note || undefined,
					liters: Number(row.liters),
					pricePerLiter: Number(row.pricePerLiter),
					totalPrice: Number(row.totalPrice),
					mileage: Number(row.mileage),
					date: row.date ? new Date(row.date) : (row.createdAt ? new Date(row.createdAt) : undefined),
					createdAt: row.createdAt ? new Date(row.createdAt) : undefined,
				} as Partial<IRefuel>);

				await refuel.save();

				importedPayloads.push({
					id: refuel.id,
					userId: refuel.userId,
					vehicleId: refuel.vehicleId,
					fuelType: refuel.fuelType,
					note: refuel.note,
					liters: refuel.liters,
					pricePerLiter: refuel.pricePerLiter,
					totalPrice: refuel.totalPrice,
					mileage: refuel.mileage,
					date: refuel.date || refuel.createdAt,
					createdAt: refuel.createdAt,
				});
			}

			new Succ(201, `Imported ${importedPayloads.length} refuel records`, importedPayloads);
			return importedPayloads;
		} catch (err: any) {
			new Err(400, "Refuel CSV import failed", err.message);
			throw err;
		}
	}
}

export default RefuelService;
