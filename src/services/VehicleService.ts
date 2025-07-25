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
}

export default VehicleService;
