import mongoose from "mongoose";
import ServiceTrackerService from "../src/services/ServiceTrackerService";
import ServiceTask from "../src/models/ServiceTask";
import ServiceInterval from "../src/models/ServiceInterval";
import ServiceLog from "../src/models/ServiceLog";
import ServiceRecord from "../src/models/ServiceRecord";
import Vehicle from "../src/models/Vehicle";
import Refuel from "../src/models/Refuel";
import OdometerRecord from "../src/models/OdometerRecord";

const DAY = 86400000;
const daysFromNow = (d: number) => new Date(Date.now() + d * DAY);

/** query mock supporting `.sort()` (awaitable) and `.sort().select()` */
const q = (val: any) => ({
	sort: () => Object.assign(Promise.resolve(val), { select: () => Promise.resolve(val) }),
});

describe("ServiceTrackerService – detailed behaviour", () => {
	const vehicle = { id: "car", createdAt: daysFromNow(-100) };
	const tasks = [
		{ id: "t1", name: "Oil" },
		{ id: "t2", name: "Brakes" },
	];

	let logs: Record<string, any>;
	let records: Record<string, any>;
	let latest: { refuel?: number; log?: number; record?: number; odo?: number };

	beforeEach(() => {
		logs = {};
		records = {};
		latest = {};
		jest.spyOn(console, "log").mockImplementation(() => {});
		jest.spyOn(Vehicle, "findOne").mockResolvedValue(vehicle as any);
		jest.spyOn(ServiceTrackerService, "listServiceTasks").mockResolvedValue(tasks);
		jest.spyOn(ServiceTask, "find").mockResolvedValue(tasks as any);
		jest.spyOn(ServiceLog, "findOne").mockImplementation(((filter: any) =>
			q(filter.serviceTaskId ? logs[filter.serviceTaskId] ?? null : latest.log !== undefined ? { odometer: latest.log } : null)) as any);
		jest.spyOn(ServiceRecord, "findOne").mockImplementation(((filter: any) =>
			q(filter.$or ? records[filter.$or[1].serviceType] ?? null : latest.record !== undefined ? { mileage: latest.record } : null)) as any);
		jest.spyOn(Refuel, "findOne").mockImplementation((() => q(latest.refuel !== undefined ? { mileage: latest.refuel } : null)) as any);
		jest.spyOn(OdometerRecord, "findOne").mockImplementation((() => q(latest.odo !== undefined ? { mileage: latest.odo } : null)) as any);
	});

	afterEach(() => jest.restoreAllMocks());

	describe("getLatestOdometer", () => {
		it("takes the maximum over all sources", async () => {
			latest = { refuel: 100, log: 300, record: 200, odo: 250 };
			await expect(ServiceTrackerService.getLatestOdometer("car")).resolves.toBe(300);
		});

		it("returns 0 without data or on errors", async () => {
			await expect(ServiceTrackerService.getLatestOdometer("car")).resolves.toBe(0);
			(Refuel.findOne as jest.Mock).mockImplementation(() => {
				throw new Error("db");
			});
			await expect(ServiceTrackerService.getLatestOdometer("car")).resolves.toBe(0);
		});
	});

	describe("getServiceStatus", () => {
		const status = async (intervals: any[]) => {
			jest.spyOn(ServiceInterval, "find").mockResolvedValue(intervals as any);
			return ServiceTrackerService.getServiceStatus("u", "car");
		};

		it("throws for vehicles the user does not own", async () => {
			(Vehicle.findOne as jest.Mock).mockResolvedValue(null);
			await expect(ServiceTrackerService.getServiceStatus("u", "car")).rejects.toThrow("Vehicle not found");
		});

		it("skips intervals of unknown tasks", async () => {
			await expect(status([{ serviceTaskId: "missing", intervalKm: 1, intervalMonths: null }])).resolves.toEqual([]);
		});

		it("uses vehicle creation and odometer 0 when never serviced", async () => {
			latest.refuel = 9000;
			const [s] = await status([{ serviceTaskId: "t1", intervalKm: 10000, intervalMonths: null }]);
			expect(s).toMatchObject({ lastServiceDate: null, lastServiceOdometer: null, nextServiceOdometer: 10000, remainingKm: 1000, status: "WARNING" });
		});

		it("uses the newer of service log and service record", async () => {
			latest.refuel = 20000;
			logs.t1 = { date: daysFromNow(-10), odometer: 19000 };
			records.Oil = { date: daysFromNow(-50), mileage: 15000 };
			logs.t2 = { date: daysFromNow(-60), odometer: 10000 };
			records.Brakes = { date: daysFromNow(-5), mileage: 19500 };
			const [oil, brakes] = await status([
				{ serviceTaskId: "t1", intervalKm: 10000, intervalMonths: null },
				{ serviceTaskId: "t2", intervalKm: 10000, intervalMonths: null },
			]);
			expect(oil).toMatchObject({ lastServiceOdometer: 19000, remainingKm: 9000, status: "OK" });
			expect(brakes).toMatchObject({ lastServiceOdometer: 19500, remainingKm: 9500, status: "OK" });
		});

		it("falls back to a matching service record alone", async () => {
			records.Oil = { date: daysFromNow(-400), mileage: 1000 };
			const [s] = await status([{ serviceTaskId: "t1", intervalKm: null, intervalMonths: 12 }]);
			expect(s.lastServiceOdometer).toBe(1000);
			expect(s.status).toBe("OVERDUE");
			expect(s.remainingDays).toBeLessThan(0);
		});

		it("flags date warnings within 30 days and OK otherwise", async () => {
			logs.t1 = { date: daysFromNow(-350), odometer: 0 };
			logs.t2 = { date: daysFromNow(-10), odometer: 0 };
			const [soon, fine] = await status([
				{ serviceTaskId: "t1", intervalKm: null, intervalMonths: 12 },
				{ serviceTaskId: "t2", intervalKm: null, intervalMonths: 12 },
			]);
			expect(soon.status).toBe("WARNING");
			expect(fine.status).toBe("OK");
			expect(fine.nextServiceDate).toBeInstanceOf(Date);
		});

		it("reports whichever limit comes first", async () => {
			latest.refuel = 12000;
			logs.t1 = { date: daysFromNow(-10), odometer: 0 };
			const [s] = await status([{ serviceTaskId: "t1", intervalKm: 10000, intervalMonths: 12 }]);
			expect(s).toMatchObject({ remainingKm: -2000, status: "OVERDUE" });
			expect(s.remainingDays).toBeGreaterThan(300);
		});
	});

	describe("getServiceIntervals", () => {
		it("maps task names and marks unknown tasks", async () => {
			jest.spyOn(ServiceInterval, "find").mockResolvedValue([
				{ id: "i1", carId: "car", serviceTaskId: "t1", intervalKm: 1, intervalMonths: 2 },
				{ id: "i2", carId: "car", serviceTaskId: "zz", intervalKm: null, intervalMonths: 3 },
			] as any);
			const result = await ServiceTrackerService.getServiceIntervals("u", "car");
			expect(result.map((r) => r.serviceTaskName)).toEqual(["Oil", "Unknown Task"]);
		});

		it("throws for foreign vehicles", async () => {
			(Vehicle.findOne as jest.Mock).mockResolvedValue(null);
			await expect(ServiceTrackerService.getServiceIntervals("u", "car")).rejects.toThrow("Vehicle not found");
		});
	});

	describe("saveServiceIntervals", () => {
		beforeEach(() => {
			jest.spyOn(mongoose.Model.prototype, "save").mockImplementation(function (this: any) {
				return Promise.resolve(this);
			});
		});

		it("creates, updates, deletes and skips intervals", async () => {
			const existing = { intervalKm: 1, intervalMonths: 1, save: jest.fn().mockResolvedValue(true) };
			jest.spyOn(ServiceInterval, "findOne").mockImplementation(((f: any) => Promise.resolve(f.serviceTaskId === "t1" ? existing : null)) as any);
			const del = jest.spyOn(ServiceInterval, "findOneAndDelete").mockResolvedValue(null);
			jest.spyOn(ServiceTrackerService, "getOrCreateServiceTask").mockResolvedValue({ id: "t9" });

			const saved = await ServiceTrackerService.saveServiceIntervals("u", "car", [
				{ serviceTaskId: "t1", intervalKm: 15000, intervalMonths: 12 },
				{ serviceTaskId: "t2", intervalKm: null, intervalMonths: null },
				{ serviceTaskName: "Custom", intervalKm: 5000, intervalMonths: null },
				{ intervalKm: 1, intervalMonths: 1 },
			] as any);

			expect(existing).toMatchObject({ intervalKm: 15000, intervalMonths: 12 });
			expect(existing.save).toHaveBeenCalled();
			expect(del).toHaveBeenCalledWith({ carId: "car", serviceTaskId: "t2", userId: "u" });
			expect(saved).toHaveLength(2);
			expect(saved[1]).toMatchObject({ serviceTaskId: "t9", intervalKm: 5000, carId: "car", userId: "u" });
		});

		it("throws for foreign vehicles", async () => {
			(Vehicle.findOne as jest.Mock).mockResolvedValue(null);
			await expect(ServiceTrackerService.saveServiceIntervals("u", "car", [])).rejects.toThrow("Vehicle not found");
		});
	});
});

describe("ServiceTrackerService.listServiceTasks", () => {
	afterEach(() => jest.restoreAllMocks());

	it("seeds missing default tasks once and refetches", async () => {
		jest.spyOn(console, "log").mockImplementation(() => {});
		const save = jest.spyOn(mongoose.Model.prototype, "save").mockImplementation(function (this: any) {
			return Promise.resolve(this);
		});
		const find = jest.spyOn(ServiceTask, "find").mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: "x" }] as any);
		await expect(ServiceTrackerService.listServiceTasks()).resolves.toEqual([{ id: "x" }]);
		expect(save).toHaveBeenCalled();
		expect(find).toHaveBeenCalledTimes(2);
	});

	it("rethrows database errors", async () => {
		jest.spyOn(ServiceTask, "find").mockRejectedValue(new Error("db"));
		await expect(ServiceTrackerService.listServiceTasks()).rejects.toThrow("db");
	});
});
