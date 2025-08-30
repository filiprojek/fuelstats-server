import ServiceRecord, { IServiceRecord } from "../models/ServiceRecord";
import { Err, Succ } from "./globalService";

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
				photos: record.photos,
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
				photos: record.photos,
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
				photos: r.photos,
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
				photos: updated.photos,
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
}

export default ServiceRecordService;
