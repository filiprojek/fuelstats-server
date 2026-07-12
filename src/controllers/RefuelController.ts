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
				date: req.body.date ? new Date(req.body.date) : undefined,
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
				date: req.body.date ? new Date(req.body.date) : undefined,
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

	static async exportCSV(req: Request, res: Response): Promise<Response | void> {
		try {
			const userId = (req as any).user.sub as string;
			const vehicleId = req.query.vehicleId as string | undefined;

			const csv = await RefuelService.exportCSV(userId, vehicleId);

			res.setHeader("Content-Type", "text/csv");
			res.setHeader("Content-Disposition", `attachment; filename="refuels-${vehicleId || "all"}-${Date.now()}.csv"`);
			return res.status(200).send(csv);
		} catch (err: any) {
			new Err(500, "Refuel CSV export failed", err);
			return res.status(500).json({ message: "Refuel CSV export failed" });
		}
	}

	static async importCSV(req: Request, res: Response): Promise<Response> {
		try {
			const userId = (req as any).user.sub as string;
			const defaultVehicleId = req.query.vehicleId as string | undefined;

			let csvContent = "";
			if (typeof req.body === "string") {
				csvContent = req.body;
			} else if (req.body && typeof req.body.csv === "string") {
				csvContent = req.body.csv;
			} else {
				return res.status(400).json({ message: "Invalid CSV content. Provide raw text or a JSON body with a 'csv' property." });
			}

			const records = await RefuelService.importCSV(userId, csvContent, defaultVehicleId);
			return res.status(201).json({ message: `Successfully imported ${records.length} refuel records`, count: records.length, records });
		} catch (err: any) {
			const status = err.status || 400;
			return res.status(status).json({ message: err.message || "CSV import failed" });
		}
	}
}

export default RefuelController;
