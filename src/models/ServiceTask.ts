import { type Document, model, Schema } from "mongoose";

export interface IServiceTask extends Document {
	name: string;
}

const serviceTaskSchema = new Schema<IServiceTask>(
	{
		name: { type: String, required: true, unique: true },
	},
	{ timestamps: false },
);

const ServiceTask = model<IServiceTask>("ServiceTask", serviceTaskSchema);
export default ServiceTask;
