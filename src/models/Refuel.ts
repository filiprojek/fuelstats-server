import { Schema, model, Document } from "mongoose";

export interface IRefuel extends Document {
        userId: string;
        vehicleId: string;
        fuelType: string;
        note?: string;
        liters: number;
        pricePerLiter: number;
        totalPrice: number;
        mileage: number;
        createdAt: Date;
}

const refuelSchema = new Schema<IRefuel>(
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
                fuelType: {
                        type: String,
                        required: true,
                },
                note: {
                        type: String,
                },
                liters: {
                        type: Number,
                        required: true,
                },
                pricePerLiter: {
                        type: Number,
                        required: true,
                },
                totalPrice: {
                        type: Number,
                        required: true,
                },
                mileage: {
                        type: Number,
                        required: true,
                },
        },
        {
                timestamps: { createdAt: true, updatedAt: false },
        },
);

const Refuel = model<IRefuel>("Refuel", refuelSchema);
export default Refuel;
