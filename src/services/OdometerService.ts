import OdometerRecord, { IOdometerRecord } from "../models/OdometerRecord";
import { Err, Succ } from "./globalService";

export interface CreateOdometerDTO {
	userId: string;
	vehicleId: string;
	mileage: number;
	date?: Date;
	note?: string;
}

export interface OdometerPayload {
	id: string;
	userId: string;
	vehicleId: string;
	mileage: number;
	date: Date;
	note?: string;
	createdAt: Date;
}

class OdometerService {
	/**
	 * Create a new standalone odometer record.
	 */
	static async create(dto: CreateOdometerDTO): Promise<OdometerPayload> {
		try {
			const record = new OdometerRecord({
				userId: dto.userId,
				vehicleId: dto.vehicleId,
				mileage: dto.mileage,
				date: dto.date || new Date(),
				note: dto.note,
			});

			await record.save();

			const payload: OdometerPayload = {
				id: record.id,
				userId: record.userId,
				vehicleId: record.vehicleId,
				mileage: record.mileage,
				date: record.date,
				note: record.note,
				createdAt: record.createdAt,
			};

			new Succ(201, "Odometer record created", payload);
			return payload;
		} catch (err: any) {
			new Err(500, "Odometer record creation failed", err);
			throw err;
		}
	}

	/**
	 * List odometer records for a user, optionally filtered by vehicleId.
	 */
	static async list(userId: string, vehicleId?: string): Promise<OdometerPayload[]> {
		try {
			const filter: any = { userId };
			if (vehicleId && vehicleId !== "all") {
				filter.vehicleId = vehicleId;
			}

			const records = await OdometerRecord.find(filter).sort({ date: -1, createdAt: -1 });

			const payload: OdometerPayload[] = records.map((r) => ({
				id: r.id,
				userId: r.userId,
				vehicleId: r.vehicleId,
				mileage: r.mileage,
				date: r.date,
				note: r.note,
				createdAt: r.createdAt,
			}));

			new Succ(200, "Fetched odometer records", payload);
			return payload;
		} catch (err: any) {
			new Err(500, "Odometer records fetch failed", err);
			throw err;
		}
	}

	/**
	 * Get an odometer record by ID.
	 */
	static async getById(id: string, userId: string): Promise<OdometerPayload | null> {
		try {
			const record = await OdometerRecord.findOne({ _id: id, userId });
			if (!record) {
				new Err(404, "Odometer record not found", { id, userId });
				return null;
			}

			const payload: OdometerPayload = {
				id: record.id,
				userId: record.userId,
				vehicleId: record.vehicleId,
				mileage: record.mileage,
				date: record.date,
				note: record.note,
				createdAt: record.createdAt,
			};

			new Succ(200, "Odometer record fetched", payload);
			return payload;
		} catch (err: any) {
			new Err(500, "Odometer record fetch failed", err);
			throw err;
		}
	}

	/**
	 * Update an odometer record.
	 */
	static async update(id: string, userId: string, payload: Partial<Pick<IOdometerRecord, "mileage" | "date" | "note" | "vehicleId">>): Promise<OdometerPayload> {
		try {
			const updated = await OdometerRecord.findOneAndUpdate({ _id: id, userId }, payload, { new: true });
			if (!updated) {
				new Err(404, "Odometer record not found");
				throw new Error("Odometer record not found");
			}

			const result: OdometerPayload = {
				id: updated.id,
				userId: updated.userId,
				vehicleId: updated.vehicleId,
				mileage: updated.mileage,
				date: updated.date,
				note: updated.note,
				createdAt: updated.createdAt,
			};

			new Succ(200, "Odometer record updated", result);
			return result;
		} catch (err: any) {
			if (err.message === "Odometer record not found") {
				throw err;
			}
			new Err(500, "Odometer record update failed", err);
			throw err;
		}
	}

	/**
	 * Remove an odometer record.
	 */
	static async remove(id: string, userId: string): Promise<boolean> {
		try {
			const deleted = await OdometerRecord.findOneAndDelete({ _id: id, userId });
			if (!deleted) {
				new Err(404, "Odometer record not found or not owned by user", { id, userId });
				throw new Error("Odometer record not found");
			}

			new Succ(204, "Odometer record deleted", { id });
			return true;
		} catch (err: any) {
			if (err.message === "Odometer record not found") {
				throw err;
			}
			new Err(500, "Odometer record deletion failed", err);
			throw err;
		}
	}
}

export default OdometerService;
