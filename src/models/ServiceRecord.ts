import { Schema, model, Document } from "mongoose";

export interface IServiceRecord extends Document {
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
        photos?: Buffer[];
        date: Date;
        createdAt: Date;
}

const serviceRecordSchema = new Schema<IServiceRecord>(
	{
		userId: { type: String, required: true, index: true },
		vehicleId: { type: String, required: true, index: true },
		serviceType: { type: String, required: true },
		customType: { type: String },
		itemName: { type: String },
		cost: { type: Number, required: true },
		mileage: { type: Number, required: true },
		shop: { type: String },
		selfService: { type: Boolean, default: false },
                note: { type: String },
                photos: { type: [Buffer], default: [] },
                date: { type: Date, required: true },
	},
	{ timestamps: { createdAt: true, updatedAt: false } },
);

const ServiceRecord = model<IServiceRecord>("ServiceRecord", serviceRecordSchema);
export default ServiceRecord;
