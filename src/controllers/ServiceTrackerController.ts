import { Request, Response } from "express";
import ServiceTrackerService from "../services/ServiceTrackerService";
import { Err, Succ } from "../services/globalService";

class ServiceTrackerController {
	/**
	 * GET /api/v1/vehicles/service-tasks (or /api/v1/services/tasks)
	 * Get the list of all available service tasks in the dictionary.
	 */
	static async listServiceTasks(req: Request, res: Response): Promise<Response> {
		try {
			const tasks = await ServiceTrackerService.listServiceTasks();
			new Succ(200, "Fetched service tasks list", tasks);
			return res.status(200).json(tasks);
		} catch (err: any) {
			new Err(500, "Failed to fetch service tasks list", err);
			return res.status(500).json({ message: "Failed to fetch service tasks list" });
		}
	}

	/**
	 * POST /api/v1/vehicles/service-tasks
	 * Create a custom service task item in the dictionary.
	 */
	static async createServiceTask(req: Request, res: Response): Promise<Response> {
		try {
			const { name } = req.body;
			if (!name || typeof name !== "string" || !name.trim()) {
				return res.status(400).json({ message: "Task name is required" });
			}
			const task = await ServiceTrackerService.getOrCreateServiceTask(name.trim());
			new Succ(201, "Service task created", task);
			return res.status(201).json(task);
		} catch (err: any) {
			new Err(500, "Failed to create service task", err);
			return res.status(500).json({ message: "Failed to create service task" });
		}
	}

	/**
	 * GET /api/v1/vehicles/:carId/service-intervals
	 * Get service intervals configured for the specified vehicle.
	 */
	static async getServiceIntervals(req: Request, res: Response): Promise<Response> {
		try {
			const userId = (req as any).user.sub as string;
			const carId = req.params.carId;
			const intervals = await ServiceTrackerService.getServiceIntervals(userId, carId);
			new Succ(200, "Fetched service intervals", intervals);
			return res.status(200).json(intervals);
		} catch (err: any) {
			if (err.message === "Vehicle not found") {
				return res.status(404).json({ message: "Vehicle not found or unauthorized" });
			}
			new Err(500, "Failed to fetch service intervals", err);
			return res.status(500).json({ message: "Failed to fetch service intervals" });
		}
	}

	/**
	 * POST/PUT /api/v1/vehicles/:carId/service-intervals
	 * Save service intervals for the specified vehicle.
	 */
	static async saveServiceIntervals(req: Request, res: Response): Promise<Response> {
		try {
			const userId = (req as any).user.sub as string;
			const carId = req.params.carId;
			const intervals = req.body.intervals || req.body; // accept { intervals: [...] } or direct array [...]

			if (!Array.isArray(intervals)) {
				return res.status(400).json({ message: "Payload must be an array of intervals or contain an 'intervals' array property" });
			}

			const saved = await ServiceTrackerService.saveServiceIntervals(userId, carId, intervals);
			new Succ(200, "Saved service intervals", saved);
			return res.status(200).json(saved);
		} catch (err: any) {
			if (err.message === "Vehicle not found") {
				return res.status(404).json({ message: "Vehicle not found or unauthorized" });
			}
			new Err(500, "Failed to save service intervals", err);
			return res.status(500).json({ message: "Failed to save service intervals" });
		}
	}

	/**
	 * GET /api/v1/vehicles/:carId/service-status
	 * Get the calculated service tracker status for the specified vehicle.
	 */
	static async getServiceStatus(req: Request, res: Response): Promise<Response> {
		try {
			const userId = (req as any).user.sub as string;
			const carId = req.params.carId;
			const currentOdometer = await ServiceTrackerService.getLatestOdometer(carId);
			const status = await ServiceTrackerService.getServiceStatus(userId, carId);
			new Succ(200, "Calculated service tracker status", { currentOdometer, status });
			return res.status(200).json({ currentOdometer, status });
		} catch (err: any) {
			if (err.message === "Vehicle not found") {
				return res.status(404).json({ message: "Vehicle not found or unauthorized" });
			}
			new Err(500, "Failed to calculate service tracker status", err);
			return res.status(500).json({ message: "Failed to calculate service tracker status" });
		}
	}

	/**
	 * POST /api/v1/vehicles/seed-test-data
	 * Seed test data for vehicle 'car_test_123'
	 */
	static async seedTestData(req: Request, res: Response): Promise<Response> {
		try {
			const userId = (req as any).user.sub as string;
			await ServiceTrackerService.seedTestData(userId);
			new Succ(201, "Successfully seeded tracker test data for car_test_123");
			return res.status(201).json({ message: "Successfully seeded tracker test data for car_test_123" });
		} catch (err: any) {
			new Err(500, "Failed to seed tracker test data", err);
			return res.status(500).json({ message: "Failed to seed tracker test data" });
		}
	}
}

export default ServiceTrackerController;
