import { Request, Response } from "express";
import ServiceRecordService from "../services/ServiceRecordService";
import { Err, Succ } from "../services/globalService";
import fs from "fs-extra";
import path from "path";
import { randomUUID } from "crypto";

const saveBase64Photo = async (base64: string): Promise<string> => {
        const match = base64.match(/^data:(image\/\w+);base64,(.+)$/);
        const data = match ? match[2] : base64;
        const mime = match ? match[1] : "image/png";
        const ext = mime.split("/")[1];
        const filename = `${randomUUID()}.${ext}`;
        const uploadDir = path.join(__dirname, "../public/uploads");
        await fs.ensureDir(uploadDir);
        await fs.writeFile(path.join(uploadDir, filename), data, "base64");
        return filename;
};

class ServiceRecordController {
	static async create(req: Request, res: Response): Promise<Response> {
		try {
                        const userId = (req as any).user.sub as string;
                        const photoInputs = Array.isArray(req.body.photos)
                                ? (req.body.photos as string[])
                                : req.body.photos
                                        ? [req.body.photos as string]
                                        : undefined;
                        const photos = photoInputs
                                ? await Promise.all(photoInputs.map(saveBase64Photo))
                                : undefined;
                        const dto = {
                                userId,
                                vehicleId: req.body.vehicleId,
                                serviceType: req.body.serviceType,
                                customType: req.body.customType,
                                itemName: req.body.itemName,
                                cost: Number(req.body.cost),
                                mileage: Number(req.body.mileage),
                                shop: req.body.shop,
                                selfService: req.body.selfService === "true" || req.body.selfService === true,
                                note: req.body.note,
                                photos,
                                date: new Date(req.body.date),
                        };
                        const record = await ServiceRecordService.create(dto);
			new Succ(201, "Service record created", record);
			return res.status(201).json(record);
		} catch (err: any) {
			new Err(500, "Service record creation failed", err);
			return res.status(500).json({ message: "Service record creation failed" });
		}
	}

	static async show(req: Request, res: Response): Promise<Response> {
		try {
			const userId = (req as any).user.sub as string;
			const id = req.params.id;
			const record = await ServiceRecordService.getById(id, userId);
			if (!record) {
				new Err(404, "Service record not found", { id, userId });
				return res.status(404).json({ message: "Service record not found" });
			}
			new Succ(200, "Service record fetched", record);
			return res.status(200).json(record);
		} catch (err: any) {
			new Err(500, "Service record fetch failed", err);
			return res.status(500).json({ message: "Service record fetch failed" });
		}
	}

	static async list(req: Request, res: Response): Promise<Response> {
		try {
			const userId = (req as any).user.sub as string;
			const records = await ServiceRecordService.list(userId);
			new Succ(200, "Fetched service records", records);
			return res.status(200).json(records);
		} catch (err: any) {
			new Err(500, "Service record fetch failed", err);
			return res.status(500).json({ message: "Service record fetch failed" });
		}
	}

	static async update(req: Request, res: Response): Promise<Response> {
		try {
                        const userId = (req as any).user.sub as string;
                        const id = req.params.id;
                        const photoInputs = Array.isArray(req.body.photos)
                                ? (req.body.photos as string[])
                                : req.body.photos
                                        ? [req.body.photos as string]
                                        : undefined;
                        const payload: any = {
                                vehicleId: req.body.vehicleId,
                                serviceType: req.body.serviceType,
                                customType: req.body.customType,
                                itemName: req.body.itemName,
                                cost: req.body.cost ? Number(req.body.cost) : undefined,
                                mileage: req.body.mileage ? Number(req.body.mileage) : undefined,
                                shop: req.body.shop,
                                selfService: req.body.selfService === "true" || req.body.selfService === true,
                                note: req.body.note,
                                date: req.body.date ? new Date(req.body.date) : undefined,
                        };
                        if (photoInputs) {
                                payload.photos = await Promise.all(photoInputs.map(saveBase64Photo));
                        }
                        const record = await ServiceRecordService.update(id, userId, payload);
                        new Succ(200, "Service record updated", record);
                        return res.status(200).json(record);
		} catch (err: any) {
			if (err.message === "Service record not found") {
				new Err(404, "Service record not found", err);
				return res.status(404).json({ message: "Service record not found" });
			}
			new Err(500, "Service record update failed", err);
			return res.status(500).json({ message: "Service record update failed" });
		}
	}

	static async remove(req: Request, res: Response): Promise<Response> {
		try {
			const userId = (req as any).user.sub as string;
			const id = req.params.id;
			await ServiceRecordService.remove(id, userId);
			new Succ(204, "Service record deleted", { id });
			return res.status(204).send();
		} catch (err: any) {
			if (err.message === "Service record not found") {
				new Err(404, "Service record not found", err);
				return res.status(404).json({ message: "Service record not found" });
			}
			new Err(500, "Service record deletion failed", err);
			return res.status(500).json({ message: "Service record deletion failed" });
		}
	}
}

export default ServiceRecordController;
