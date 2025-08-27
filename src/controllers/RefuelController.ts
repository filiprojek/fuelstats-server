import { Request, Response } from "express";
import RefuelService from "../services/RefuelService";
import { Err, Succ } from "../services/globalService";

class RefuelController {
        static async create(req: Request, res: Response): Promise<Response> {
                try {
                        const userId = (req as any).user.sub as string;
                        const dto = {
                                userId,
                                vehicleId: req.body.vehicleId,
                                fuelType: req.body.fuelType,
                                note: req.body.note,
                                liters: req.body.liters,
                                pricePerLiter: req.body.pricePerLiter,
                                totalPrice: req.body.totalPrice,
                                mileage: req.body.mileage,
                        };
                        const refuel = await RefuelService.create(dto);
                        new Succ(201, "Refuel created", refuel);
                        return res.status(201).json(refuel);
                } catch (err: any) {
                        new Err(500, "Refuel creation failed", err);
                        return res.status(500).json({ message: "Refuel creation failed" });
                }
        }

        static async show(req: Request, res: Response): Promise<Response> {
                try {
                        const userId = (req as any).user.sub as string;
                        const id = req.params.id;
                        const refuel = await RefuelService.getById(id, userId);
                        if (!refuel) {
                                new Err(404, "Refuel not found", { id, userId });
                                return res.status(404).json({ message: "Refuel not found" });
                        }
                        new Succ(200, "Refuel fetched", refuel);
                        return res.status(200).json(refuel);
                } catch (err: any) {
                        new Err(500, "Refuel fetch failed", err);
                        return res.status(500).json({ message: "Refuel fetch failed" });
                }
        }

        static async list(req: Request, res: Response): Promise<Response> {
                try {
                        const userId = (req as any).user.sub as string;
                        const refuels = await RefuelService.list(userId);
                        new Succ(200, "Fetched refuels", refuels);
                        return res.status(200).json(refuels);
                } catch (err: any) {
                        new Err(500, "Refuel fetch failed", err);
                        return res.status(500).json({ message: "Refuel fetch failed" });
                }
        }

        static async update(req: Request, res: Response): Promise<Response> {
                try {
                        const userId = (req as any).user.sub as string;
                        const id = req.params.id;
                        const payload = {
                                vehicleId: req.body.vehicleId,
                                fuelType: req.body.fuelType,
                                note: req.body.note,
                                liters: req.body.liters,
                                pricePerLiter: req.body.pricePerLiter,
                                totalPrice: req.body.totalPrice,
                                mileage: req.body.mileage,
                        };
                        const refuel = await RefuelService.update(id, userId, payload);
                        new Succ(200, "Refuel updated", refuel);
                        return res.status(200).json(refuel);
                } catch (err: any) {
                        if (err.message === "Refuel not found") {
                                new Err(404, "Refuel not found", err);
                                return res.status(404).json({ message: "Refuel not found" });
                        }
                        new Err(500, "Refuel update failed", err);
                        return res.status(500).json({ message: "Refuel update failed" });
                }
        }

        static async remove(req: Request, res: Response): Promise<Response> {
                try {
                        const userId = (req as any).user.sub as string;
                        const id = req.params.id;
                        await RefuelService.remove(id, userId);
                        new Succ(204, "Refuel deleted", { id });
                        return res.status(204).send();
                } catch (err: any) {
                        if (err.message === "Refuel not found") {
                                new Err(404, "Refuel not found", err);
                                return res.status(404).json({ message: "Refuel not found" });
                        }
                        new Err(500, "Refuel deletion failed", err);
                        return res.status(500).json({ message: "Refuel deletion failed" });
                }
        }
}

export default RefuelController;
