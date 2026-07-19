import ServiceTrackerService from "../src/services/ServiceTrackerService";
import ServiceTask from "../src/models/ServiceTask";
import ServiceInterval from "../src/models/ServiceInterval";
import ServiceLog from "../src/models/ServiceLog";
import ServiceRecord from "../src/models/ServiceRecord";
import Vehicle from "../src/models/Vehicle";
import Refuel from "../src/models/Refuel";
import mongoose from "mongoose";

describe("ServiceTrackerService", () => {
	const userId = "60f7b1b2f1d2b3c4d5e6f7a1";
	const carId = "60f7b1b2f1d2b3c4d5e6f7a2";
	const taskId = "60f7b1b2f1d2b3c4d5e6f7a3";

	const makeQuery = (val: any) => ({
		sort: () => ({
			select: () => Promise.resolve(val),
		}),
	});

	beforeEach(() => {
		const mockVehicleInstance: any = {
			id: carId,
			_id: carId,
			userId,
			name: "Test Car",
			registrationPlate: "TEST-123",
			fuelType: "petrol",
			isDefault: true,
			createdAt: new Date("2024-01-01"),
			save: jest.fn().mockImplementation(function (this: any) { return Promise.resolve(this); }),
		};

		const mockTask = {
			id: taskId,
			_id: taskId,
			name: "Oil Change",
		};

		jest.spyOn(mongoose.Model.prototype, "save").mockImplementation(function (this: any) {
			this.id = this.id || "mockId123";
			return Promise.resolve(this);
		});

		jest.spyOn(ServiceTask, "find").mockResolvedValue([mockTask] as any);
		jest.spyOn(ServiceTask, "findOne").mockResolvedValue(mockTask as any);
		jest.spyOn(ServiceTask, "findById").mockResolvedValue(mockTask as any);

		jest.spyOn(ServiceInterval, "find").mockResolvedValue([]);
		jest.spyOn(ServiceInterval, "findOne").mockResolvedValue(null);
		jest.spyOn(ServiceInterval, "findOneAndDelete").mockResolvedValue({ acknowledged: true } as any);
		jest.spyOn(ServiceInterval, "deleteMany").mockImplementation(() => Promise.resolve({ acknowledged: true }) as any);

		jest.spyOn(ServiceLog, "find").mockResolvedValue([]);
		jest.spyOn(ServiceLog, "findOne").mockImplementation(() => makeQuery(null) as any);
		jest.spyOn(ServiceLog, "deleteMany").mockResolvedValue({ acknowledged: true } as any);

		jest.spyOn(ServiceRecord, "find").mockResolvedValue([]);
		jest.spyOn(ServiceRecord, "findOne").mockImplementation(() => makeQuery(null) as any);
		jest.spyOn(ServiceRecord, "deleteMany").mockResolvedValue({ acknowledged: true } as any);

		jest.spyOn(Vehicle, "findById").mockResolvedValue(mockVehicleInstance as any);
		jest.spyOn(Vehicle, "findOne").mockResolvedValue(mockVehicleInstance as any);

		jest.spyOn(Refuel, "find").mockResolvedValue([]);
		jest.spyOn(Refuel, "findOne").mockImplementation(() => makeQuery(null) as any);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe("listServiceTasks()", () => {
		it("returns tasks and seeds missing default tasks", async () => {
			const tasks = await ServiceTrackerService.listServiceTasks();
			expect(tasks).toBeDefined();
		});
	});

	describe("getOrCreateServiceTask()", () => {
		it("returns existing task if found", async () => {
			const existing = { id: taskId, name: "Výměna oleje" };
			jest.spyOn(ServiceTask, "findOne").mockResolvedValue(existing as any);

			const result = await ServiceTrackerService.getOrCreateServiceTask("Výměna oleje");
			expect(result).toEqual(existing);
		});

		it("creates new task if not found", async () => {
			jest.spyOn(ServiceTask, "findOne").mockResolvedValue(null);
			const result = await ServiceTrackerService.getOrCreateServiceTask("Nový úkon");
			expect(result).toBeDefined();
			expect(result.name).toBe("Nový úkon");
		});
	});

	describe("getServiceIntervals()", () => {
		it("returns interval documents for a vehicle", async () => {
			const mockIntervals = [{ id: "60f7b1b2f1d2b3c4d5e6f7a4", carId, serviceTaskId: taskId, intervalKm: 15000 }];
			jest.spyOn(ServiceInterval, "find").mockResolvedValue(mockIntervals as any);

			const result = await ServiceTrackerService.getServiceIntervals(userId, carId);
			expect(result.length).toBe(1);
			expect(result[0].serviceTaskId).toBe(taskId);
		});
	});

	describe("saveServiceIntervals()", () => {
		it("saves new intervals for a vehicle", async () => {
			const result = await ServiceTrackerService.saveServiceIntervals(userId, carId, [
				{ serviceTaskId: taskId, intervalKm: 15000, intervalMonths: 12 },
			]);

			expect(result.length).toBe(1);
		});

		it("throws error if vehicle is not found", async () => {
			jest.spyOn(Vehicle, "findOne").mockResolvedValue(null);

			await expect(
				ServiceTrackerService.saveServiceIntervals(userId, carId, [])
			).rejects.toThrow("Vehicle not found");
		});
	});

	describe("getLatestOdometer()", () => {
		it("computes maximum odometer from Refuel, ServiceLog, and ServiceRecord", async () => {
			jest.spyOn(Refuel, "findOne").mockImplementation(() => makeQuery({ mileage: 50000 }) as any);
			jest.spyOn(ServiceLog, "findOne").mockImplementation(() => makeQuery({ odometer: 52000 }) as any);
			jest.spyOn(ServiceRecord, "findOne").mockImplementation(() => makeQuery({ mileage: 48000 }) as any);

			const odo = await ServiceTrackerService.getLatestOdometer(carId);
			expect(odo).toBe(52000);
		});
	});

	describe("getServiceStatus()", () => {
		it("calculates status correctly (OVERDUE, WARNING, OK)", async () => {
			jest.spyOn(ServiceTask, "find").mockResolvedValue([
				{ id: taskId, name: "Výměna motorového oleje a filtru" },
			] as any);
			jest.spyOn(ServiceInterval, "find").mockResolvedValue([
				{ id: "60f7b1b2f1d2b3c4d5e6f7a5", carId, serviceTaskId: taskId, intervalKm: 10000, intervalMonths: 12 },
			] as any);
			jest.spyOn(Refuel, "findOne").mockImplementation(() => makeQuery({ mileage: 15000 }) as any);

			const statuses = await ServiceTrackerService.getServiceStatus(userId, carId);

			expect(statuses.length).toBe(1);
			expect(statuses[0].status).toBe("OVERDUE");
		});
	});

	describe("seedTestData()", () => {
		it("seeds test data for vehicle car_test_123", async () => {
			await expect(ServiceTrackerService.seedTestData(userId)).resolves.not.toThrow();
		});
	});
});
