import Refuel, { IRefuel } from "../models/Refuel";
import { Err, Succ } from "./globalService";

export interface CreateRefuelDTO {
        userId: string;
        vehicleId: string;
        fuelType: string;
        note?: string;
        liters: number;
        pricePerLiter: number;
        totalPrice: number;
        mileage: number;
}

export interface RefuelPayload {
        id: string;
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

class RefuelService {
        static async create(data: CreateRefuelDTO): Promise<RefuelPayload> {
                try {
                        const refuel = new Refuel({
                                userId: data.userId,
                                vehicleId: data.vehicleId,
                                fuelType: data.fuelType,
                                note: data.note,
                                liters: data.liters,
                                pricePerLiter: data.pricePerLiter,
                                totalPrice: data.totalPrice,
                                mileage: data.mileage,
                        } as Partial<IRefuel>);

                        await refuel.save();

                        const payload: RefuelPayload = {
                                id: refuel.id,
                                userId: refuel.userId,
                                vehicleId: refuel.vehicleId,
                                fuelType: refuel.fuelType,
                                note: refuel.note,
                                liters: refuel.liters,
                                pricePerLiter: refuel.pricePerLiter,
                                totalPrice: refuel.totalPrice,
                                mileage: refuel.mileage,
                                createdAt: refuel.createdAt,
                        };

                        new Succ(201, "Refuel created", payload);
                        return payload;
                } catch (err: any) {
                        new Err(500, "Refuel creation failed", err);
                        throw err;
                }
        }

        static async getById(id: string, userId: string): Promise<RefuelPayload | null> {
                try {
                        const refuel = await Refuel.findOne({ _id: id, userId });
                        if (!refuel) {
                                new Err(404, "Refuel not found", { id, userId });
                                return null;
                        }

                        const payload: RefuelPayload = {
                                id: refuel.id,
                                userId: refuel.userId,
                                vehicleId: refuel.vehicleId,
                                fuelType: refuel.fuelType,
                                note: refuel.note,
                                liters: refuel.liters,
                                pricePerLiter: refuel.pricePerLiter,
                                totalPrice: refuel.totalPrice,
                                mileage: refuel.mileage,
                                createdAt: refuel.createdAt,
                        };

                        new Succ(200, "Refuel fetched", payload);
                        return payload;
                } catch (err: any) {
                        new Err(500, "Refuel fetch failed", err);
                        throw err;
                }
        }

        static async list(userId: string): Promise<RefuelPayload[]> {
                try {
                        const refuels = await Refuel.find({ userId });
                        const payload = refuels.map((r) => ({
                                id: r.id,
                                userId: r.userId,
                                vehicleId: r.vehicleId,
                                fuelType: r.fuelType,
                                note: r.note,
                                liters: r.liters,
                                pricePerLiter: r.pricePerLiter,
                                totalPrice: r.totalPrice,
                                mileage: r.mileage,
                                createdAt: r.createdAt,
                        }));
                        new Succ(200, "Fetched refuels", payload);
                        return payload;
                } catch (err: any) {
                        new Err(500, "Refuel fetch failed", err);
                        throw err;
                }
        }

        static async update(
                id: string,
                userId: string,
                payload: Partial<Pick<IRefuel, "vehicleId" | "fuelType" | "note" | "liters" | "pricePerLiter" | "totalPrice" | "mileage">>,
        ): Promise<RefuelPayload> {
                try {
                        const updated = await Refuel.findOneAndUpdate({ _id: id, userId }, payload, { new: true });
                        if (!updated) {
                                new Err(404, "Refuel not found");
                                throw new Error("Refuel not found");
                        }
                        const result: RefuelPayload = {
                                id: updated.id,
                                userId: updated.userId,
                                vehicleId: updated.vehicleId,
                                fuelType: updated.fuelType,
                                note: updated.note,
                                liters: updated.liters,
                                pricePerLiter: updated.pricePerLiter,
                                totalPrice: updated.totalPrice,
                                mileage: updated.mileage,
                                createdAt: updated.createdAt,
                        };
                        new Succ(200, "Refuel updated", result);
                        return result;
                } catch (err: any) {
                        if (err.message === "Refuel not found") {
                                throw err;
                        }
                        new Err(500, "Refuel update failed", err);
                        throw err;
                }
        }

        static async remove(id: string, userId: string): Promise<void> {
                try {
                        const deleted = await Refuel.findOneAndDelete({ _id: id, userId });
                        if (!deleted) {
                                new Err(404, `Refuel not found or not owned by user`, { id, userId });
                                throw new Error("Refuel not found");
                        }
                        new Succ(200, "Refuel removed", { id });
                } catch (err: any) {
                        if (err.message === "Refuel not found") {
                                throw err;
                        }
                        new Err(500, "Refuel deletion failed", err);
                        throw err;
                }
        }
}

export default RefuelService;
