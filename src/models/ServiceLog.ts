import { Schema, model, Document } from "mongoose";

export interface IServiceLog extends Document {
	userId: string;
	carId: string;
	serviceTaskId: string;
	serviceRecordId?: string;
	date: Date;
	odometer: number;
	price: number;
	note?: string;
	createdAt: Date;
}

const serviceLogSchema = new Schema<IServiceLog>(
	{
		userId: { type: String, required: true, index: true },
		carId: { type: String, required: true, index: true },
		serviceTaskId: { type: String, required: true, index: true },
		serviceRecordId: { type: String, index: true },
		date: { type: Date, required: true },
		odometer: { type: Number, required: true },
		price: { type: Number, required: true },
		note: { type: String },
	},
	{ timestamps: { createdAt: true, updatedAt: false } }
);

const ServiceLog = model<IServiceLog>("ServiceLog", serviceLogSchema);
export default ServiceLog;
