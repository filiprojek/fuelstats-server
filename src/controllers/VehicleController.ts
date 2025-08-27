import { Request, Response } from "express";
import VehicleService from "../services/VehicleService";
import { Err, Succ } from "../services/globalService";

class VehicleController {
	static async create(req: Request, res: Response): Promise<Response> {
		try {
			// pull userId from the verified token
			const userId = (req as any).user.sub as string;

			const dto = {
				userId,
				name: req.body.name,
				registrationPlate: req.body.registrationPlate,
				fuelType: req.body.fuelType,
				note: req.body.note,
				isDefault: req.body.isDefault,
			};

			const vehicle = await VehicleService.create(dto);
			new Succ(201, "Vehicle created", vehicle);
			return res.status(201).json(vehicle);
		} catch (err: any) {
			new Err(500, "Vehicle creation failed", err);
			return res.status(500).json({ message: "Vehicle creation failed" });
		}
	}

	static async list(req: Request, res: Response): Promise<Response> {
		try {
			const userId = (req as any).user.sub as string;
			const vehicles = await VehicleService.list(userId);
			new Succ(200, "Fetched vehicles", vehicles);
			return res.status(200).json(vehicles);
		} catch (err: any) {
			new Err(500, "Vehicle fetch failed", err);
			return res.status(500).json({ message: "Vehicle fetch failed" });
		}
	}
}

export default VehicleController;
