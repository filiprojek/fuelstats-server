import { Schema, model, Document } from "mongoose";

export interface IServiceInterval extends Document {
	userId: string;
	carId: string;
	serviceTaskId: string;
	intervalKm: number | null;
	intervalMonths: number | null;
}

const serviceIntervalSchema = new Schema<IServiceInterval>(
	{
		userId: { type: String, required: true, index: true },
		carId: { type: String, required: true, index: true },
		serviceTaskId: { type: String, required: true, index: true },
		intervalKm: { type: Number, default: null },
		intervalMonths: { type: Number, default: null },
	},
	{ timestamps: { createdAt: true, updatedAt: true } }
);

const ServiceInterval = model<IServiceInterval>("ServiceInterval", serviceIntervalSchema);
export default ServiceInterval;
