import { Request, Response } from "express";
import OdometerService from "../services/OdometerService";
import { Err } from "../services/globalService";

class OdometerController {
	/**
	 * POST /api/v1/odometer
	 * Create a new standalone odometer log record.
	 */
	static async create(req: Request, res: Response): Promise<Response> {
		try {
			const userId = (req as any).user.sub as string;
			const { vehicleId, mileage, date, note } = req.body;

			if (!vehicleId || mileage === undefined || mileage === null) {
				return res.status(400).json({ message: "vehicleId and mileage are required" });
			}

			const record = await OdometerService.create({
				userId,
				vehicleId,
				mileage: Number(mileage),
				date: date ? new Date(date) : new Date(),
				note,
			});

			return res.status(201).json(record);
		} catch (err: any) {
			new Err(500, "Failed to create odometer record", err);
			return res.status(500).json({ message: "Failed to create odometer record" });
		}
	}

	/**
	 * GET /api/v1/odometer
	 * List odometer logs for current user. Optional query param: vehicleId.
	 */
	static async list(req: Request, res: Response): Promise<Response> {
		try {
			const userId = (req as any).user.sub as string;
			const vehicleId = req.query.vehicleId as string | undefined;

			const records = await OdometerService.list(userId, vehicleId);
			return res.status(200).json(records);
		} catch (err: any) {
			new Err(500, "Failed to list odometer records", err);
			return res.status(500).json({ message: "Failed to list odometer records" });
		}
	}

	/**
	 * GET /api/v1/odometer/:id
	 */
	static async getById(req: Request, res: Response): Promise<Response> {
		try {
			const userId = (req as any).user.sub as string;
			const id = req.params.id;

			const record = await OdometerService.getById(id, userId);
			if (!record) {
				return res.status(404).json({ message: "Odometer record not found" });
			}
			return res.status(200).json(record);
		} catch (err: any) {
			new Err(500, "Failed to fetch odometer record", err);
			return res.status(500).json({ message: "Failed to fetch odometer record" });
		}
	}

	/**
	 * PUT /api/v1/odometer/:id
	 */
	static async update(req: Request, res: Response): Promise<Response> {
		try {
			const userId = (req as any).user.sub as string;
			const id = req.params.id;
			const { vehicleId, mileage, date, note } = req.body;

			const updatePayload: any = {};
			if (vehicleId) updatePayload.vehicleId = vehicleId;
			if (mileage !== undefined && mileage !== null) updatePayload.mileage = Number(mileage);
			if (date) updatePayload.date = new Date(date);
			if (note !== undefined) updatePayload.note = note;

			const updated = await OdometerService.update(id, userId, updatePayload);
			return res.status(200).json(updated);
		} catch (err: any) {
			if (err.message === "Odometer record not found") {
				return res.status(404).json({ message: "Odometer record not found" });
			}
			new Err(500, "Failed to update odometer record", err);
			return res.status(500).json({ message: "Failed to update odometer record" });
		}
	}

	/**
	 * DELETE /api/v1/odometer/:id
	 */
	static async remove(req: Request, res: Response): Promise<Response> {
		try {
			const userId = (req as any).user.sub as string;
			const id = req.params.id;

			await OdometerService.remove(id, userId);
			return res.status(204).send();
		} catch (err: any) {
			if (err.message === "Odometer record not found") {
				return res.status(404).json({ message: "Odometer record not found" });
			}
			new Err(500, "Failed to delete odometer record", err);
			return res.status(500).json({ message: "Failed to delete odometer record" });
		}
	}
}

export default OdometerController;
