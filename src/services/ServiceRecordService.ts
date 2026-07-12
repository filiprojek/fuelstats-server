import ServiceRecord, { IServiceRecord } from "../models/ServiceRecord";
import { Err, Succ } from "./globalService";
import { toCSV, parseCSV } from "../utils/csv";

export interface CreateServiceRecordDTO {
	userId: string;
	vehicleId: string;
	serviceType: string;
	customType?: string;
	itemName?: string;
	cost: number;
	mileage: number;
	shop?: string;
	selfService?: boolean;
	note?: string;
	photos?: string[];
	date: Date;
}

export interface ServiceRecordPayload {
	id: string;
	userId: string;
	vehicleId: string;
	serviceType: string;
	customType?: string;
	itemName?: string;
	cost: number;
	mileage: number;
	shop?: string;
	selfService?: boolean;
	note?: string;
	photos?: string[];
	date: Date;
	createdAt: Date;
}

class ServiceRecordService {
	static async create(data: CreateServiceRecordDTO): Promise<ServiceRecordPayload> {
		try {
			const record = new ServiceRecord({
				userId: data.userId,
				vehicleId: data.vehicleId,
				serviceType: data.serviceType,
				customType: data.customType,
				itemName: data.itemName,
				cost: data.cost,
				mileage: data.mileage,
				shop: data.shop,
				selfService: data.selfService,
				note: data.note,
				photos: data.photos,
				date: data.date,
			} as Partial<IServiceRecord>);

			await record.save();

			const payload: ServiceRecordPayload = {
				id: record.id,
				userId: record.userId,
				vehicleId: record.vehicleId,
				serviceType: record.serviceType,
				customType: record.customType,
				itemName: record.itemName,
				cost: record.cost,
				mileage: record.mileage,
				shop: record.shop,
				selfService: record.selfService,
				note: record.note,
				photos: record.photos?.map((p) => `/uploads/${p}`),
				date: record.date,
				createdAt: record.createdAt,
			};

			new Succ(201, "Service record created", payload);
			return payload;
		} catch (err: any) {
			new Err(500, "Service record creation failed", err);
			throw err;
		}
	}

	static async getById(id: string, userId: string): Promise<ServiceRecordPayload | null> {
		try {
			const record = await ServiceRecord.findOne({ _id: id, userId });
			if (!record) {
				new Err(404, "Service record not found", { id, userId });
				return null;
			}

			const payload: ServiceRecordPayload = {
				id: record.id,
				userId: record.userId,
				vehicleId: record.vehicleId,
				serviceType: record.serviceType,
				customType: record.customType,
				itemName: record.itemName,
				cost: record.cost,
				mileage: record.mileage,
				shop: record.shop,
				selfService: record.selfService,
				note: record.note,
				photos: record.photos?.map((p) => `/uploads/${p}`),
				date: record.date,
				createdAt: record.createdAt,
			};

			new Succ(200, "Service record fetched", payload);
			return payload;
		} catch (err: any) {
			new Err(500, "Service record fetch failed", err);
			throw err;
		}
	}

	static async list(userId: string): Promise<ServiceRecordPayload[]> {
		try {
			const records = await ServiceRecord.find({ userId });
			const payload = records.map((r) => ({
				id: r.id,
				userId: r.userId,
				vehicleId: r.vehicleId,
				serviceType: r.serviceType,
				customType: r.customType,
				itemName: r.itemName,
				cost: r.cost,
				mileage: r.mileage,
				shop: r.shop,
				selfService: r.selfService,
				note: r.note,
				photos: r.photos?.map((p) => `/uploads/${p}`),
				date: r.date,
				createdAt: r.createdAt,
			}));
			new Succ(200, "Fetched service records", payload);
			return payload;
		} catch (err: any) {
			new Err(500, "Service record fetch failed", err);
			throw err;
		}
	}

	static async update(
		id: string,
		userId: string,
		payload: Partial<Pick<IServiceRecord, "vehicleId" | "serviceType" | "customType" | "itemName" | "cost" | "mileage" | "shop" | "selfService" | "note" | "photos" | "date">>,
	): Promise<ServiceRecordPayload> {
		try {
			const updated = await ServiceRecord.findOneAndUpdate({ _id: id, userId }, payload, { new: true });
			if (!updated) {
				new Err(404, "Service record not found");
				throw new Error("Service record not found");
			}
			const result: ServiceRecordPayload = {
				id: updated.id,
				userId: updated.userId,
				vehicleId: updated.vehicleId,
				serviceType: updated.serviceType,
				customType: updated.customType,
				itemName: updated.itemName,
				cost: updated.cost,
				mileage: updated.mileage,
				shop: updated.shop,
				selfService: updated.selfService,
				note: updated.note,
				photos: updated.photos?.map((p) => `/uploads/${p}`),
				date: updated.date,
				createdAt: updated.createdAt,
			};
			new Succ(200, "Service record updated", result);
			return result;
		} catch (err: any) {
			if (err.message === "Service record not found") {
				throw err;
			}
			new Err(500, "Service record update failed", err);
			throw err;
		}
	}

	static async remove(id: string, userId: string): Promise<void> {
		try {
			const deleted = await ServiceRecord.findOneAndDelete({ _id: id, userId });
			if (!deleted) {
				new Err(404, "Service record not found or not owned by user", { id, userId });
				throw new Error("Service record not found");
			}
			new Succ(200, "Service record removed", { id });
		} catch (err: any) {
			if (err.message === "Service record not found") {
				throw err;
			}
			new Err(500, "Service record deletion failed", err);
			throw err;
		}
	}

	static async exportCSV(userId: string, vehicleId?: string): Promise<string> {
		try {
			const filter: any = { userId };
			if (vehicleId) {
				filter.vehicleId = vehicleId;
			}
			const records = await ServiceRecord.find(filter).sort({ date: 1 });
			const rows = records.map((r) => ({
				id: r.id,
				vehicleId: r.vehicleId,
				serviceType: r.serviceType,
				customType: r.customType || "",
				itemName: r.itemName || "",
				cost: r.cost,
				mileage: r.mileage,
				shop: r.shop || "",
				selfService: r.selfService ? "true" : "false",
				note: r.note || "",
				photos: r.photos ? r.photos.join(";") : "",
				date: r.date.toISOString(),
				createdAt: r.createdAt.toISOString(),
			}));
			return toCSV(rows);
		} catch (err: any) {
			new Err(500, "Service record export CSV failed", err);
			throw err;
		}
	}

	static async importCSV(userId: string, csvContent: string, defaultVehicleId?: string): Promise<ServiceRecordPayload[]> {
		try {
			const parsedRows = parseCSV(csvContent);
			const importedPayloads: ServiceRecordPayload[] = [];
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

				if (!row.serviceType) {
					throw new Error("Missing serviceType in CSV row");
				}
				if (!row.cost || isNaN(Number(row.cost))) {
					throw new Error("Invalid or missing cost in CSV row");
				}
				if (!row.mileage || isNaN(Number(row.mileage))) {
					throw new Error("Invalid or missing mileage in CSV row");
				}
				if (!row.date) {
					throw new Error("Missing date in CSV row");
				}

				const selfService = row.selfService === "true" || row.selfService === "1";

				const photos = row.photos ? row.photos.split(";").map((p) => p.trim()).filter((p) => p) : [];
				const record = new ServiceRecord({
					userId,
					vehicleId: rowVehicleId,
					serviceType: row.serviceType,
					customType: row.customType || undefined,
					itemName: row.itemName || undefined,
					cost: Number(row.cost),
					mileage: Number(row.mileage),
					shop: row.shop || undefined,
					selfService,
					note: row.note || undefined,
					photos,
					date: new Date(row.date),
					createdAt: row.createdAt ? new Date(row.createdAt) : undefined,
				} as Partial<IServiceRecord>);

				await record.save();

				importedPayloads.push({
					id: record.id,
					userId: record.userId,
					vehicleId: record.vehicleId,
					serviceType: record.serviceType,
					customType: record.customType,
					itemName: record.itemName,
					cost: record.cost,
					mileage: record.mileage,
					shop: record.shop,
					selfService: record.selfService,
					note: record.note,
					photos: record.photos?.map((p) => `/uploads/${p}`),
					date: record.date,
					createdAt: record.createdAt,
				});
			}

			new Succ(201, `Imported ${importedPayloads.length} service records`, importedPayloads);
			return importedPayloads;
		} catch (err: any) {
			new Err(400, "Service record CSV import failed", err.message);
			throw err;
		}
	}
}

export default ServiceRecordService;
