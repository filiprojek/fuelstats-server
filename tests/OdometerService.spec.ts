import mongoose from "mongoose";
import OdometerRecord from "../src/models/OdometerRecord";
import OdometerService from "../src/services/OdometerService";

describe("OdometerService", () => {
	const validHexId = "60f7b1b2f1d2b3c4d5e6f7a1";
	const userId = "user123";
	const vehicleId = "veh123";

	beforeEach(() => {
		jest.spyOn(mongoose.Model.prototype, "save").mockImplementation(function (this: any) {
			this.id = this.id || validHexId;
			this.createdAt = this.createdAt || new Date();
			return Promise.resolve(this);
		});
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it("creates a new odometer record", async () => {
		const dto = {
			userId,
			vehicleId,
			mileage: 75000,
			note: "Monthly odometer check",
		};

		const res = await OdometerService.create(dto);
		expect(res.userId).toBe(userId);
		expect(res.vehicleId).toBe(vehicleId);
		expect(res.mileage).toBe(75000);
		expect(res.note).toBe("Monthly odometer check");
	});

	it("lists odometer records for a user", async () => {
		const mockRecords = [
			{ id: "o1", userId, vehicleId, mileage: 80000, date: new Date(), createdAt: new Date() },
		];

		const makeQuery = (val: any) => ({
			sort: () => Promise.resolve(val),
		});

		jest.spyOn(OdometerRecord, "find").mockReturnValue(makeQuery(mockRecords) as any);

		const list = await OdometerService.list(userId, vehicleId);
		expect(list.length).toBe(1);
		expect(list[0].mileage).toBe(80000);
	});

	it("gets an odometer record by ID", async () => {
		const mockRecord = {
			id: validHexId,
			userId,
			vehicleId,
			mileage: 80000,
			date: new Date(),
			createdAt: new Date(),
		};

		jest.spyOn(OdometerRecord, "findOne").mockResolvedValue(mockRecord as any);

		const record = await OdometerService.getById(validHexId, userId);
		expect(record).not.toBeNull();
		expect(record?.mileage).toBe(80000);
	});

	it("updates an odometer record", async () => {
		const updatedRecord = {
			id: validHexId,
			userId,
			vehicleId,
			mileage: 85000,
			date: new Date(),
			createdAt: new Date(),
		};

		jest.spyOn(OdometerRecord, "findOneAndUpdate").mockResolvedValue(updatedRecord as any);

		const res = await OdometerService.update(validHexId, userId, { mileage: 85000 });
		expect(res.mileage).toBe(85000);
	});

	it("removes an odometer record", async () => {
		jest.spyOn(OdometerRecord, "findOneAndDelete").mockResolvedValue({ id: validHexId } as any);

		const success = await OdometerService.remove(validHexId, userId);
		expect(success).toBe(true);
	});
});
