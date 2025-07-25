import { Schema, model, Document } from "mongoose";

export interface IVehicle extends Document {
	userId: string;
	name: string;
	registrationPlate: string;
	fuelType: string;
	note?: string;
	isDefault: boolean;
	createdAt: Date;
}

const vehicleSchema = new Schema<IVehicle>(
	{
		userId: {
			type: String,
			required: true,
			index: true,
		},
		name: {
			type: String,
			required: true,
		},
		registrationPlate: {
			type: String,
			required: true,
		},
		fuelType: {
			type: String,
			required: true,
		},
		note: {
			type: String,
		},
		isDefault: {
			type: Boolean,
			default: false,
		},
	},
	{
		timestamps: { createdAt: true, updatedAt: false },
	},
);

const Vehicle = model<IVehicle>("Vehicle", vehicleSchema);
export default Vehicle;
