import { Schema, model, Document } from "mongoose";

export interface IOdometerRecord extends Document {
	userId: string;
	vehicleId: string;
	mileage: number;
	date: Date;
	note?: string;
	createdAt: Date;
}

const odometerRecordSchema = new Schema<IOdometerRecord>(
	{
		userId: {
			type: String,
			required: true,
			index: true,
		},
		vehicleId: {
			type: String,
			required: true,
			index: true,
		},
		mileage: {
			type: Number,
			required: true,
		},
		date: {
			type: Date,
			required: true,
		},
		note: {
			type: String,
		},
	},
	{ timestamps: { createdAt: true, updatedAt: false } }
);

const OdometerRecord = model<IOdometerRecord>("OdometerRecord", odometerRecordSchema);
export default OdometerRecord;
