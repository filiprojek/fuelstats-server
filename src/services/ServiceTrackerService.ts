import ServiceTask from "../models/ServiceTask";
import ServiceInterval from "../models/ServiceInterval";
import ServiceLog from "../models/ServiceLog";
import ServiceRecord from "../models/ServiceRecord";
import Refuel from "../models/Refuel";
import OdometerRecord from "../models/OdometerRecord";
import Vehicle from "../models/Vehicle";
import { Err, Succ } from "./globalService";

export interface ServiceIntervalDTO {
	serviceTaskId?: string;
	serviceTaskName?: string;
	intervalKm: number | null;
	intervalMonths: number | null;
}

export interface ServiceStatusItem {
	serviceTaskId: string;
	serviceTaskName: string;
	intervalKm: number | null;
	intervalMonths: number | null;
	lastServiceDate: Date | null;
	lastServiceOdometer: number | null;
	nextServiceDate: Date | null;
	nextServiceOdometer: number | null;
	remainingKm: number | null;
	remainingDays: number | null;
	status: "OK" | "WARNING" | "OVERDUE";
}

// Initial tasks to seed if the database is empty
const DEFAULT_SERVICE_TASKS = [
	"Výměna motorového oleje a filtru",
	"Brzdová kapalina",
	"Výměna kabinového (mikro)filtru",
	"Kontrola vozidla",
	"Použití vzduch. Filtru",
	"Palivový filtr",
	"§ prohlídka vozidla",
	"Výměna rozvodů (řemen/řetěz)",
];

class ServiceTrackerService {
	/**
	 * List all service tasks in the database.
	 * Seeds default ones if none exist.
	 */
	static async listServiceTasks(): Promise<any[]> {
		try {
			let tasks = await ServiceTask.find({});
			let hasNewSeeds = false;

			for (const name of DEFAULT_SERVICE_TASKS) {
				const exists = tasks.some((t) => t.name === name);
				if (!exists) {
					console.log(`Seeding missing service task: ${name}`);
					await new ServiceTask({ name }).save();
					hasNewSeeds = true;
				}
			}

			if (hasNewSeeds) {
				tasks = await ServiceTask.find({});
			}
			return tasks;
		} catch (err: any) {
			new Err(500, "Failed to list service tasks", err);
			throw err;
		}
	}

	/**
	 * Find or create a service task by name (case-insensitive search).
	 */
	static async getOrCreateServiceTask(name: string): Promise<any> {
		try {
			let task = await ServiceTask.findOne({ name: { $regex: new RegExp(`^${name}$`, "i") } });
			if (!task) {
				task = new ServiceTask({ name });
				await task.save();
			}
			return task;
		} catch (err: any) {
			new Err(500, "Failed to get or create service task", err);
			throw err;
		}
	}

	/**
	 * Get the latest known odometer reading (mileage) for a vehicle.
	 * Max of all refuels, service logs, service records, and odometer records.
	 */
	static async getLatestOdometer(vehicleId: string): Promise<number> {
		try {
			const latestRefuel = await Refuel.findOne({ vehicleId }).sort({ mileage: -1 }).select("mileage");
			const latestServiceLog = await ServiceLog.findOne({ carId: vehicleId }).sort({ odometer: -1 }).select("odometer");
			const latestServiceRecord = await ServiceRecord.findOne({ vehicleId }).sort({ mileage: -1 }).select("mileage");
			const latestOdometerRecord = await OdometerRecord.findOne({ vehicleId }).sort({ mileage: -1 }).select("mileage");

			const refuelKm = latestRefuel ? latestRefuel.mileage : 0;
			const serviceLogKm = latestServiceLog ? latestServiceLog.odometer : 0;
			const serviceRecordKm = latestServiceRecord ? latestServiceRecord.mileage : 0;
			const odometerRecordKm = latestOdometerRecord ? latestOdometerRecord.mileage : 0;

			return Math.max(refuelKm, serviceLogKm, serviceRecordKm, odometerRecordKm, 0);
		} catch (err: any) {
			new Err(500, "Failed to retrieve latest odometer", err);
			return 0;
		}
	}

	/**
	 * Get the set intervals for a specific car.
	 */
	static async getServiceIntervals(userId: string, carId: string): Promise<any[]> {
		try {
			// Verify vehicle ownership
			const vehicle = await Vehicle.findOne({ _id: carId, userId });
			if (!vehicle) {
				throw new Error("Vehicle not found");
			}

			// Make sure task dictionary is seeded
			await this.listServiceTasks();

			const intervals = await ServiceInterval.find({ carId, userId });
			const tasks = await ServiceTask.find({});
			const taskMap = new Map(tasks.map((t) => [t.id, t.name]));

			return intervals.map((interval) => ({
				id: interval.id,
				carId: interval.carId,
				serviceTaskId: interval.serviceTaskId,
				serviceTaskName: taskMap.get(interval.serviceTaskId) || "Unknown Task",
				intervalKm: interval.intervalKm,
				intervalMonths: interval.intervalMonths,
			}));
		} catch (err: any) {
			new Err(500, "Failed to get service intervals", err);
			throw err;
		}
	}

	/**
	 * Set or update intervals for a car.
	 */
	static async saveServiceIntervals(userId: string, carId: string, intervals: ServiceIntervalDTO[]): Promise<any[]> {
		try {
			// Verify vehicle ownership
			const vehicle = await Vehicle.findOne({ _id: carId, userId });
			if (!vehicle) {
				throw new Error("Vehicle not found");
			}

			const savedIntervals = [];

			for (const item of intervals) {
				let taskId = item.serviceTaskId;

				if (!taskId && item.serviceTaskName) {
					const task = await this.getOrCreateServiceTask(item.serviceTaskName);
					taskId = task.id;
				}

				if (!taskId) continue;

				// If both intervals are null, delete the interval record
				if (item.intervalKm === null && item.intervalMonths === null) {
					await ServiceInterval.findOneAndDelete({ carId, serviceTaskId: taskId, userId });
					continue;
				}

				let interval = await ServiceInterval.findOne({ carId, serviceTaskId: taskId, userId });
				if (interval) {
					interval.intervalKm = item.intervalKm;
					interval.intervalMonths = item.intervalMonths;
					await interval.save();
				} else {
					interval = new ServiceInterval({
						userId,
						carId,
						serviceTaskId: taskId,
						intervalKm: item.intervalKm,
						intervalMonths: item.intervalMonths,
					});
					await interval.save();
				}
				savedIntervals.push(interval);
			}

			return savedIntervals;
		} catch (err: any) {
			new Err(500, "Failed to save service intervals", err);
			throw err;
		}
	}

	/**
	 * Calculate service maintenance status.
	 */
	static async getServiceStatus(userId: string, carId: string): Promise<ServiceStatusItem[]> {
		try {
			const vehicle = await Vehicle.findOne({ _id: carId, userId });
			if (!vehicle) {
				throw new Error("Vehicle not found");
			}

			// Pre-seed if needed
			await this.listServiceTasks();

			const intervals = await ServiceInterval.find({ carId, userId });
			const tasks = await ServiceTask.find({});
			const taskMap = new Map(tasks.map((t) => [t.id, t]));

			const currentOdometer = await this.getLatestOdometer(carId);
			const today = new Date();
			const results: ServiceStatusItem[] = [];

			for (const interval of intervals) {
				const task = taskMap.get(interval.serviceTaskId);
				if (!task) continue;

				// Find the latest service log in ServiceLog
				let lastLog = await ServiceLog.findOne({ carId, serviceTaskId: task.id }).sort({ date: -1 });

				// Fallback to ServiceRecord by matching type or custom type with the task name
				let lastRecord = await ServiceRecord.findOne({
					vehicleId: carId,
					$or: [
						{ serviceType: task.id },
						{ serviceType: task.name },
						{ customType: task.name }
					]
				}).sort({ date: -1 });

				let lastServiceDate: Date | null = null;
				let lastServiceOdometer: number | null = null;

				// Determine which one is newer
				if (lastLog && lastRecord) {
					if (lastLog.date >= lastRecord.date) {
						lastServiceDate = lastLog.date;
						lastServiceOdometer = lastLog.odometer;
					} else {
						lastServiceDate = lastRecord.date;
						lastServiceOdometer = lastRecord.mileage;
					}
				} else if (lastLog) {
					lastServiceDate = lastLog.date;
					lastServiceOdometer = lastLog.odometer;
				} else if (lastRecord) {
					lastServiceDate = lastRecord.date;
					lastServiceOdometer = lastRecord.mileage;
				}

				// fallback if no prior service exists: use odometer 0 and vehicle createdAt
				const baseDate = lastServiceDate || vehicle.createdAt || new Date();
				const baseOdometer = lastServiceOdometer !== null ? lastServiceOdometer : 0;

				let nextServiceDate: Date | null = null;
				let nextServiceOdometer: number | null = null;
				let remainingKm: number | null = null;
				let remainingDays: number | null = null;

				let kmStatus: "OK" | "WARNING" | "OVERDUE" = "OK";
				let dateStatus: "OK" | "WARNING" | "OVERDUE" = "OK";

				// Calculate Kilometers
				if (interval.intervalKm !== null && interval.intervalKm > 0) {
					nextServiceOdometer = baseOdometer + interval.intervalKm;
					remainingKm = nextServiceOdometer - currentOdometer;

					if (remainingKm < 0) {
						kmStatus = "OVERDUE";
					} else if (remainingKm < 2000) {
						kmStatus = "WARNING";
					} else {
						kmStatus = "OK";
					}
				}

				// Calculate Months/Date
				if (interval.intervalMonths !== null && interval.intervalMonths > 0) {
					const date = new Date(baseDate);
					date.setMonth(date.getMonth() + interval.intervalMonths);
					nextServiceDate = date;

					const diffTime = nextServiceDate.getTime() - today.getTime();
					remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

					if (remainingDays < 0) {
						dateStatus = "OVERDUE";
					} else if (remainingDays < 30) {
						dateStatus = "WARNING";
					} else {
						dateStatus = "OK";
					}
				}

				// Final status determination: "whichever occurs first"
				let finalStatus: "OK" | "WARNING" | "OVERDUE" = "OK";
				if (kmStatus === "OVERDUE" || dateStatus === "OVERDUE") {
					finalStatus = "OVERDUE";
				} else if (kmStatus === "WARNING" || dateStatus === "WARNING") {
					finalStatus = "WARNING";
				}

				results.push({
					serviceTaskId: task.id,
					serviceTaskName: task.name,
					intervalKm: interval.intervalKm,
					intervalMonths: interval.intervalMonths,
					lastServiceDate,
					lastServiceOdometer,
					nextServiceDate,
					nextServiceOdometer,
					remainingKm,
					remainingDays,
					status: finalStatus,
				});
			}

			return results;
		} catch (err: any) {
			new Err(500, "Failed to calculate service status", err);
			throw err;
		}
	}

	/**
	 * Seed historical test data for vehicle 'car_test_123'
	 */
	static async seedTestData(userId: string): Promise<void> {
		try {
			const carId = "car_test_123";

			// 1. Create test vehicle if not exists
			let vehicle = await Vehicle.findById(carId);
			if (!vehicle) {
				vehicle = new Vehicle({
					_id: carId,
					userId,
					name: "Škoda Octavia (Test)",
					registrationPlate: "EL-123-AA",
					fuelType: "diesel",
					note: "Testovací auto pro hlídání servisu",
					isDefault: false,
				} as any);
				await vehicle.save();
			} else {
				// Update owner to current user
				vehicle.userId = userId;
				await vehicle.save();
			}

			// 2. Clear existing tracker data for this car
			await ServiceInterval.deleteMany({ carId, userId });
			await ServiceLog.deleteMany({ carId, userId });
			await ServiceRecord.deleteMany({ vehicleId: carId, userId });

			// 3. Find or create the two main tasks
			const taskOil = await this.getOrCreateServiceTask("Výměna motorového oleje a filtru");
			const taskBrake = await this.getOrCreateServiceTask("Brzdová kapalina");

			// Also make sure other tasks are seeded
			await this.listServiceTasks();

			// 4. Create intervals
			const intervalOil = new ServiceInterval({
				userId,
				carId,
				serviceTaskId: taskOil.id,
				intervalKm: 30000,
				intervalMonths: 24,
			});
			const intervalBrake = new ServiceInterval({
				userId,
				carId,
				serviceTaskId: taskBrake.id,
				intervalKm: null,
				intervalMonths: 24,
			});
			await Promise.all([intervalOil.save(), intervalBrake.save()]);

			// 5. Create historical service records & logs
			const history = [
				{ date: new Date("2019-01-24T12:00:00.000Z"), odometer: 17632, task: taskOil, note: "garanční prohlídka (balíček Service Inclusive)" },
				{ date: new Date("2020-01-14T12:00:00.000Z"), odometer: 32384, task: taskBrake, note: "garanční prohlídka (balíček Service Inclusive)" },
				{ date: new Date("2020-07-15T12:00:00.000Z"), odometer: 36566, task: taskOil, note: "garanční prohlídka (balíček Service Inclusive)" },
				{ date: new Date("2024-07-31T12:00:00.000Z"), odometer: 57636, task: taskOil, note: "garanční prohlídka (balíček Service Inclusive)" },
				{ date: new Date("2026-02-24T12:00:00.000Z"), odometer: 62758, task: taskBrake, note: "garanční prohlídka (balíček Service Inclusive)" },
				{ date: new Date("2026-06-01T12:00:00.000Z"), odometer: 63578, task: taskOil, note: "garanční prohlídka (balíček Service Inclusive)" },
			];

			for (const item of history) {
				const record = new ServiceRecord({
					userId,
					vehicleId: carId,
					serviceType: item.task.name,
					cost: 0,
					mileage: item.odometer,
					note: item.note,
					date: item.date,
				} as any);
				await record.save();

				const log = new ServiceLog({
					userId,
					carId,
					serviceTaskId: item.task.id,
					serviceRecordId: record.id,
					date: item.date,
					odometer: item.odometer,
					price: 0,
					note: item.note,
				} as any);
				await log.save();
			}
		} catch (err: any) {
			new Err(500, "Failed to seed test data", err);
			throw err;
		}
	}
}

export default ServiceTrackerService;
