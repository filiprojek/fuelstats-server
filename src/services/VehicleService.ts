import Vehicle, { IVehicle } from "../models/Vehicle";
import { Err, Succ } from "./globalService";

/** DTO for creating a vehicle */
export interface CreateVehicleDTO {
	userId: string;
	name: string;
	registrationPlate: string;
	fuelType: string;
	note?: string;
	isDefault?: boolean;
}

/** Payload returned after creation */
export interface VehiclePayload {
	id: string;
	userId: string;
	name: string;
	registrationPlate: string;
	fuelType: string;
	note?: string;
	isDefault: boolean;
	createdAt: Date;
}

class VehicleService {
	/**
	 * Create a new vehicle for the given user.
	 */
	static async create(data: CreateVehicleDTO): Promise<VehiclePayload> {
		try {
			// Instantiate the Mongoose model
			const vehicle = new Vehicle({
				userId: data.userId,
				name: data.name,
				registrationPlate: data.registrationPlate,
				fuelType: data.fuelType,
				note: data.note,
				isDefault: data.isDefault ?? false,
			} as Partial<IVehicle>);

			// Save to MongoDB
			await vehicle.save();

			// Build the returned payload
			const payload: VehiclePayload = {
				id: vehicle.id,
				userId: vehicle.userId,
				name: vehicle.name,
				registrationPlate: vehicle.registrationPlate,
				fuelType: vehicle.fuelType,
				note: vehicle.note,
				isDefault: vehicle.isDefault,
				createdAt: vehicle.createdAt,
			};

			// Log success
			new Succ(201, "Vehicle created", payload);
			return payload;
		} catch (err: any) {
			// Log error and rethrow for controller to handle
			new Err(500, "Vehicle creation failed", err);
			throw err;
		}
	}

	/** DTO for updating a vehicle */
	static async update(
		id: string,
		userId: string,
		payload: Partial<Pick<IVehicle, "name" | "registrationPlate" | "fuelType" | "note" | "isDefault">>,
	): Promise<VehiclePayload> {
		try {
			const updated = await Vehicle.findOneAndUpdate(
				{ _id: id, userId },
				payload,
				{ new: true },
			);

			if (!updated) {
				new Err(404, "Vehicle not found");
				throw new Error("Vehicle not found");
			}

			const result: VehiclePayload = {
				id: updated.id,
				userId: updated.userId,
				name: updated.name,
				registrationPlate: updated.registrationPlate,
				fuelType: updated.fuelType,
				note: updated.note,
				isDefault: updated.isDefault,
				createdAt: updated.createdAt,
			};

			new Succ(200, "Vehicle updated", result);
			return result;
		} catch (err: any) {
			if (err.message === "Vehicle not found") {
				throw err;
			}
			new Err(500, "Vehicle update failed", err);
			throw err;
		}
	}

	/**
	 * List all vehicles for the given user.
	 */
	static async list(userId: string): Promise<VehiclePayload[]> {
		try {
			const vehicles = await Vehicle.find({ userId });
			const payload = vehicles.map((v) => ({
				id: v.id,
				userId: v.userId,
				name: v.name,
				registrationPlate: v.registrationPlate,
				fuelType: v.fuelType,
				note: v.note,
				isDefault: v.isDefault,
				createdAt: v.createdAt,
			}));
			new Succ(200, "Fetched vehicles", payload);
			return payload;
		} catch (err: any) {
			new Err(500, "Vehicle fetch failed", err);
			throw err;
		}
	}

	/**
	 * Find a vehicle by its id for the given user.
	 * Returns `null` if no such vehicle exists.
	 */
	static async getById(id: string, userId: string): Promise<VehiclePayload | null> {
		try {
			const vehicle = await Vehicle.findOne({ _id: id, userId });
			if (!vehicle) {
				new Err(404, "Vehicle not found", { id, userId });
				return null;
			}

			const payload: VehiclePayload = {
				id: vehicle.id,
				userId: vehicle.userId,
				name: vehicle.name,
				registrationPlate: vehicle.registrationPlate,
				fuelType: vehicle.fuelType,
				note: vehicle.note,
				isDefault: vehicle.isDefault,
				createdAt: vehicle.createdAt,
			};

			new Succ(200, "Vehicle fetched", payload);
			return payload;
		} catch (err: any) {
			new Err(500, "Vehicle fetch failed", err);
			throw err;
		}
	}
}

export default VehicleService;
